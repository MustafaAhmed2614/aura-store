from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import hashlib
import json
import sqlite3
from decimal import Decimal
from supabase import create_client
from datetime import datetime, timezone

app = FastAPI(title="Bazaar Retail Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://bazaarretail.com",
        "https://www.bazaarretail.com",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def home():
    return {
        "message": "Bazaar Retail Backend is running",
        "status": "success"
    }


import os
import httpx
from dotenv import load_dotenv

load_dotenv()

# Supabase connection - backend only
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError("Supabase configuration missing")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)


HHC_API_KEY = os.getenv("HHC_API_KEY")

@app.get("/api/test-hhc")
async def test_hhc():
    if not HHC_API_KEY:
        return {"success": False, "message": "HHC API key not configured"}

    url = "https://api.hhcdropshipping.com/api/dropshipper/open/products?paginate=1"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(url, headers=headers)

        if response.status_code == 200:
            return {
                "success": True,
                "message": "HHC API connected successfully",
                "status_code": response.status_code
            }

        return {
            "success": False,
            "message": "HHC API connection failed",
            "status_code": response.status_code
        }

    except httpx.RequestError:
        return {
            "success": False,
            "message": "Could not reach HHC API"
        }


@app.get("/api/products")
async def get_products():
    url = "https://api.hhcdropshipping.com/api/dropshipper/open/products?paginate=100"

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch HHC products"
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="HHC connection failed"
        )


@app.get("/api/cities")
async def get_cities():
    url = "https://api.hhcdropshipping.com/api/dropshipper/open/courier_cities"

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch HHC cities"
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="HHC connection failed"
        )



class OrderItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=10)


class OrderRequest(BaseModel):
    request_id: str = Field(min_length=8, max_length=100)
    products: list[OrderItem] = Field(min_length=1)
    full_name: str
    phone: str
    address: str
    destination_city: str



# Bazaar Retail pricing configuration
CUSTOM_PRICES = {
    186: 1450,
    996: 1890,
}

PROFIT_MARGIN = 1000
SHIPPING_FEE = 250


# Order tracking database
ORDER_DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "orders.db"
)


def init_orders_db():
    with sqlite3.connect(ORDER_DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS order_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL,
                hhc_order_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


init_orders_db()


def upgrade_orders_db():
    with sqlite3.connect(ORDER_DB_PATH) as conn:
        columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(order_attempts)"
            ).fetchall()
        }

        if "payload_hash" not in columns:
            conn.execute(
                "ALTER TABLE order_attempts ADD COLUMN payload_hash TEXT"
            )

        conn.commit()


upgrade_orders_db()



def register_order_attempt(order: OrderRequest):
    # Same order details produce the same fingerprint
    payload = order.model_dump(exclude={"request_id"})

    payload_json = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":")
    )

    payload_hash = hashlib.sha256(
        payload_json.encode("utf-8")
    ).hexdigest()

    with sqlite3.connect(
        ORDER_DB_PATH,
        timeout=10
    ) as conn:
        try:
            conn.execute(
                """
                INSERT INTO order_attempts
                    (request_id, status, payload_hash)
                VALUES (?, ?, ?)
                """,
                (
                    order.request_id,
                    "pending",
                    payload_hash
                )
            )

            conn.commit()
            return "new"

        except sqlite3.IntegrityError:
            existing = conn.execute(
                """
                SELECT payload_hash
                FROM order_attempts
                WHERE request_id = ?
                """,
                (order.request_id,)
            ).fetchone()

            if existing is None:
                raise HTTPException(
                    status_code=409,
                    detail="Order request conflict"
                )

            if existing[0] != payload_hash:
                raise HTTPException(
                    status_code=409,
                    detail="Request ID already used for a different order"
                )

            # Allow retry only if product verification
            # failed before any HHC order submission.
            status_row = conn.execute(
                """
                SELECT status, hhc_order_id
                FROM order_attempts
                WHERE request_id = ?
                """,
                (order.request_id,)
            ).fetchone()

            if (
                status_row
                and status_row[0] == "verification_failed"
                and status_row[1] is None
            ):
                cursor = conn.execute(
                    """
                    UPDATE order_attempts
                    SET status = 'pending',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE request_id = ?
                      AND status = 'verification_failed'
                      AND hhc_order_id IS NULL
                    """,
                    (order.request_id,)
                )

                conn.commit()

                if cursor.rowcount == 1:
                    return "new"

            return "duplicate"



def register_supabase_order(order: OrderRequest):
    payload = order.model_dump(exclude={"request_id"})

    payload_json = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":")
    )

    payload_hash = hashlib.sha256(
        payload_json.encode("utf-8")
    ).hexdigest()

    order_data = {
        "request_id": order.request_id,
        "payload_hash": payload_hash,
        "status": "pending",
        "customer_name": order.full_name,
        "customer_phone": order.phone,
        "customer_address": order.address,
        "customer_city": order.destination_city,
        "address": order.address,
        "city": order.destination_city,
        "country": "Pakistan",
        "payment_method": "cod",
        "items": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity
            }
            for item in order.products
        ]
    }

    try:
        result = (
            supabase.table("orders")
            .insert(order_data)
            .execute()
        )

        if not result.data:
            raise RuntimeError("Order registration failed")

        return {
            "status": "new",
            "order": result.data[0]
        }

    except Exception as error:
        # Only handle a unique-constraint violation as a duplicate.
        if getattr(error, "code", None) != "23505":
            raise

        existing = (
            supabase.table("orders")
            .select("*")
            .eq("request_id", order.request_id)
            .limit(1)
            .execute()
        )

        if not existing.data:
            raise HTTPException(
                status_code=409,
                detail="Order registration conflict"
            )

        saved_order = existing.data[0]

        if saved_order.get("payload_hash") != payload_hash:
            raise HTTPException(
                status_code=409,
                detail="Request ID already used for different order details"
            )

        
        if (
            saved_order.get("status") == "verification_failed"
            and saved_order.get("hhc_order_id") is None
        ):
            retry_success = retry_supabase_order_verification(
                order.request_id,
                payload_hash
            )

            if retry_success:
                return {
                    "status": "new",
                    "order": {
                        **saved_order,
                        "status": "pending"
                    }
                }


        return {
            "status": "duplicate",
            "order": saved_order
        }



def update_order_status(request_id: str, status: str):
    with sqlite3.connect(ORDER_DB_PATH, timeout=10) as conn:
        conn.execute(
            """
            UPDATE order_attempts
            SET status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = ?
            """,
            (status, request_id)
        )


def save_hhc_order_id(request_id: str, hhc_order_id: str):
    if not hhc_order_id:
        raise ValueError("HHC Order ID cannot be empty")

    with sqlite3.connect(ORDER_DB_PATH, timeout=10) as conn:
        cursor = conn.execute(
            """
            UPDATE order_attempts
            SET status = 'submitted',
                hhc_order_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = ?
              AND status = 'submitting'
              AND hhc_order_id IS NULL
            """,
            (str(hhc_order_id), request_id)
        )

        if cursor.rowcount != 1:
            raise ValueError(
                "Order is not in submitting state or was already saved"
            )

        conn.commit()



def mark_order_validation_failed(request_id: str):
    with sqlite3.connect(ORDER_DB_PATH, timeout=10) as conn:
        conn.execute(
            """
            UPDATE order_attempts
            SET status = 'validation_failed',
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = ?
              AND status = 'pending'
            """,
            (request_id,)
        )
        conn.commit()



def calculate_product_price(product):
    product_id = int(product["id"])

    if product_id in CUSTOM_PRICES:
        return CUSTOM_PRICES[product_id]

    wholesale_cost = float(
        product.get("salePrice")
        or product.get("wholesalePrice")
        or product.get("price")
        or 0
    )

    return (
        wholesale_cost + PROFIT_MARGIN
        if wholesale_cost > 0
        else 999
    )


def build_hhc_order_payload(order: OrderRequest, grand_total):
    return {
        "products": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity
            }
            for item in order.products
        ],
        "full_name": order.full_name,
        "phone": order.phone,
        "address": order.address,
        "destination_city": order.destination_city,
        "bp_id": int(os.getenv("HHC_BP_ID")),
        "shp_type": 1,
        "payment_method": "cod",
        "sell_price": float(
            Decimal(str(grand_total)).quantize(Decimal("0.01"))
        )
    }


def parse_hhc_order_response(response_data: dict):
    if not isinstance(response_data, dict):
        raise ValueError("Invalid HHC response format")

    # Do not assume HTTP 200 means the order was accepted.
    success = (
        response_data.get("success") is True
        or response_data.get("status") is True
    )

    if not success:
        raise ValueError(
            "HHC did not explicitly confirm order success"
        )

    data = response_data.get("data")

    if not isinstance(data, dict):
        raise ValueError(
            "HHC response does not contain order details"
        )

    order_id = (
        data.get("order_id")
        or data.get("id")
    )

    if not order_id:
        raise ValueError(
            "HHC response does not contain an order ID"
        )

    return str(order_id)






@app.get("/api/test-business-profile")
async def test_business_profile():
    if not HHC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="HHC API key not configured"
        )

    url = "https://api.hhcdropshipping.com/api/dropshipper/open/businessProfiles"

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

        data = response.json()

        profiles = data.get("data", [])

        return {
            "success": True,
            "profiles": [
                {
                    "id": profile.get("id"),
                    "isVerified": profile.get("isVerified")
                }
                for profile in profiles
            ]
        }

    except (httpx.HTTPStatusError, httpx.RequestError):
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch HHC business profiles"
        )



@app.post("/api/orders")
async def create_order(order: OrderRequest):
    if not HHC_API_KEY or not os.getenv("HHC_BP_ID"):
        raise HTTPException(
            status_code=500,
            detail="HHC configuration missing"
        )

    if not order.products:
        raise HTTPException(
            status_code=400,
            detail="Cart cannot be empty"
        )

    
    # Register this checkout attempt atomically
    attempt_status = register_order_attempt(order)

    if attempt_status == "duplicate":
        raise HTTPException(
            status_code=409,
            detail="This order request has already been received. No new order was created."
        )


    # Fetch products directly from HHC
    url = "https://api.hhcdropshipping.com/api/dropshipper/open/products?paginate=100"

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
    
    except (httpx.HTTPStatusError, httpx.RequestError):
        update_order_status(
            order.request_id,
            "verification_failed"
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to verify HHC products"
        )


    products = data.get("data", [])

    # Lookup products by ID
    
    product_map = {
        int(p["id"]): p
        for p in products
    }

    subtotal = 0

    for item in order.products:
        product = product_map.get(item.product_id)

        if not product:
            product = await find_hhc_product(item.product_id)

        
        if not product:
            mark_order_validation_failed(order.request_id)

            raise HTTPException(
                status_code=400,
                detail=f"Product {item.product_id} not found in fetched catalog"
            )


        if (
            int(product.get("quantity") or 0) < item.quantity
            or int(product.get("stockStatus") or 0) != 1
            or str(product.get("product_status", "")).lower() != "publish"
        ):
            mark_order_validation_failed(order.request_id)
            raise HTTPException(
                status_code=400,
                detail=f"Product {item.product_id} is unavailable"
            )

        price = calculate_product_price(product)
        subtotal += price * item.quantity

    grand_total = subtotal + SHIPPING_FEE
    update_order_status(order.request_id, "validated_test")

    # TEST MODE: no real HHC order submission
    return {
        "success": False,
        "test_mode": True,
        "message": "Order validated. No real order placed.",
        "subtotal": subtotal,
        "shipping_fee": SHIPPING_FEE,
        "grand_total": grand_total,
        "sell_price": grand_total,
        "business_profile_configured": True
    }


@app.get("/api/debug-products")
async def debug_products():
    if not HHC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="HHC API key not configured"
        )

    url = "https://api.hhcdropshipping.com/api/dropshipper/open/products?paginate=100"

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        products = data.get("data", [])

        return {
            "success": True,
            "total_fetched": len(products),
            "sample_products": [
                {
                    "id": product.get("id"),
                    "name": product.get("name"),
                    "quantity": product.get("quantity"),
                    "stockStatus": product.get("stockStatus")
                }
                for product in products[:10]
            ],
            "pagination": {
                key: data.get(key)
                for key in [
                    "current_page",
                    "last_page",
                    "total",
                    "next_page_url"
                ]
                if key in data
            }
        }

    except (httpx.HTTPStatusError, httpx.RequestError):
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch HHC products"
        )


@app.get("/api/products/page/{page_number}")
async def get_products_by_page(page_number: int):
    if page_number < 1 or page_number > 200:
        raise HTTPException(
            status_code=400,
            detail="Invalid page number"
        )

    if not HHC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="HHC API key not configured"
        )

    url = "https://api.hhcdropshipping.com/api/dropshipper/open/products"

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                url,
                headers=headers,
                params={
                    "paginate": 100,
                    "page": page_number
                }
            )
            response.raise_for_status()

        return response.json()

    except (httpx.HTTPStatusError, httpx.RequestError):
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch HHC product page"
        )


async def find_hhc_product(product_id: int, max_pages: int = 5):
    """
    Find a product across HHC catalog pages.
    Read-only: does not create any order.
    """
    for page in range(1, max_pages + 1):
        data = await get_products_by_page(page)

        products = data.get("data", [])

        for product in products:
            if int(product.get("id", 0)) == product_id:
                return product

        if not products or len(products) < 100:
            break

    return None


def claim_supabase_order(request_id: str, payload_hash: str) -> bool:
    """
    Atomically claim a pending Supabase order.

    Returns True only when the order successfully
    changes from pending to submitting.
    """

    response = supabase.rpc(
        "claim_order_for_submission",
        {
            "p_request_id": request_id,
            "p_payload_hash": payload_hash
        }
    ).execute()

    if not isinstance(response.data, bool):
        raise RuntimeError(
            "Unexpected Supabase order claim response"
        )

    return response.data


def save_supabase_order_total(
    request_id: str,
    grand_total: int
) -> bool:
    """
    Save the backend-validated order total in Supabase.
    Only updates a pending order with no HHC order ID.
    """

    if grand_total < 0:
        raise ValueError("Order total cannot be negative")

    response = (
        supabase.table("orders")
        .update({
            "total_amount": grand_total,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        .eq("request_id", request_id)
        .eq("status", "pending")
        .is_("hhc_order_id", "null")
        .execute()
    )

    return len(response.data or []) == 1


def retry_supabase_order_verification(
    request_id: str,
    payload_hash: str
) -> bool:
    """
    Retry only an order whose product verification failed
    before any HHC submission attempt.

    Returns True if the order was reset to pending.
    """

    response = supabase.rpc(
        "retry_order_verification",
        {
            "p_request_id": request_id,
            "p_payload_hash": payload_hash
        }
    ).execute()

    if not isinstance(response.data, bool):
        raise RuntimeError(
            "Unexpected Supabase retry response"
        )

    return response.data


def update_supabase_order_status(
    request_id: str,
    new_status: str,
    expected_status: str = "pending"
) -> bool:
    """
    Update an order status only when its current
    status matches the expected status.
    """

    allowed_statuses = {
        "validated_test",
        "validation_failed",
        "verification_failed"
    }

    if new_status not in allowed_statuses:
        raise ValueError("Invalid order status")

    response = (
        supabase.table("orders")
        .update({
            "status": new_status
        })
        .eq("request_id", request_id)
        .eq("status", expected_status)
        .is_("hhc_order_id", "null")
        .execute()
    )

    return len(response.data or []) == 1



