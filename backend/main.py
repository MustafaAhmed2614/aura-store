from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import hashlib
import json
import sqlite3
from decimal import Decimal, InvalidOperation
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


async def get_hhc_checkout_preview(products, destination_city):
    url = "https://api.hhcdropshipping.com/api/dropshipper/open/checkout"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    payload = {
        "products": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity
            }
            for item in products
        ],
        "payment_method": "cod",
        "shp_type": 1,
        "destination_city": destination_city
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()



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
async def get_products(page: int = 1):
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than zero"
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
                    "page": page
                }
            )

            response.raise_for_status()
            data = response.json()

            return {
                "data": data.get("data", []),
                "current_page": data.get("current_page", page),
                "total": data.get("total"),
                "per_page": data.get("per_page", 100)
            }

    except (httpx.HTTPStatusError, httpx.RequestError):
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch HHC products"
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


def validate_hhc_checkout_preview(preview, customer_total):
    if not isinstance(preview, dict):
        raise ValueError("Invalid HHC checkout preview")

    totals = preview.get("total")

    if not isinstance(totals, dict):
        raise ValueError("HHC checkout total is missing")

    top_level_total = totals.get("total")

    if top_level_total is None:
        raise ValueError("HHC checkout amount is missing")

    store_totals = []

    for store in preview.get("items", []):
        store_total = store.get("total", {})

        if not isinstance(store_total, dict):
            raise ValueError("Invalid HHC store total")

        amount = store_total.get("total")

        if amount is None:
            raise ValueError("HHC store amount is missing")

        store_totals.append(Decimal(str(amount)))

    if not store_totals:
        raise ValueError("HHC checkout contains no store totals")

    hhc_top_total = Decimal(str(top_level_total))
    hhc_store_total = sum(store_totals)
    selling_total = Decimal(str(customer_total))

    if any(
        not amount.is_finite() or amount < 0
        for amount in [
            hhc_top_total,
            hhc_store_total,
            selling_total
        ]
    ):
        raise ValueError("Invalid HHC checkout amount")

    required_amount = max(hhc_top_total, hhc_store_total)

    if selling_total < required_amount:
        raise ValueError(
            "Customer selling price does not cover HHC checkout charges"
        )

    return {
        "hhc_top_total": float(hhc_top_total),
        "hhc_store_total": float(hhc_store_total),
        "required_amount": float(required_amount),
        "customer_total": float(selling_total)
    }


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

    if response_data.get("success") is False:
        raise ValueError("HHC explicitly rejected the order")

    if response_data.get("status") is False:
        raise ValueError("HHC explicitly rejected the order")

    # HHC OpenAPI: successful order details are returned
    # directly, with the order ID in the top-level "id".
    order_id = response_data.get("id")

    if (
        isinstance(order_id, bool)
        or not isinstance(order_id, int)
        or order_id <= 0
    ):
        raise ValueError(
            "HHC response does not contain a valid order ID"
        )

    return str(order_id)


def is_hhc_live_submission_enabled() -> bool:
    """
    Real HHC order placement is disabled by default.
    Requires explicit activation after all safety tests.
    """
    return os.getenv(
        "HHC_LIVE_ORDERS_ENABLED",
        "false"
    ).strip().lower() == "true"


async def submit_hhc_order(order_payload: dict):
    """
    Submit an order to HHC.

    IMPORTANT:
    This function performs REAL order placement when called.
    Do not call it during local testing.
    """

    if not is_hhc_live_submission_enabled():
        raise RuntimeError(
            "Real HHC order submission is disabled"
        )

    if not HHC_API_KEY:
        raise RuntimeError("HHC API key is missing")

    url = "https://api.hhcdropshipping.com/api/dropshipper/open/orders"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            headers=headers,
            json=order_payload
        )

        response.raise_for_status()
        return response.json()



async def submit_hhc_order_safely(order_payload: dict):
    """
    Submit to HHC only when live orders are explicitly enabled.

    IMPORTANT:
    Calling this function with live mode enabled
    can create a REAL HHC order.
    """

    if not is_hhc_live_submission_enabled():
        raise RuntimeError(
            "HHC live orders are disabled"
        )

    return await submit_hhc_order(order_payload)


async def execute_hhc_submission(order_payload: dict):
    """
    Execute one HHC submission attempt.

    IMPORTANT:
    This function can create a REAL HHC order when
    live submission is enabled.

    It does not retry failed or timed-out requests.
    """

    if not is_hhc_live_submission_enabled():
        raise RuntimeError("HHC live orders are disabled")

    return await submit_hhc_order_safely(order_payload)


async def execute_hhc_submission_with_tracking(
    order_payload: dict,
    request_id: str,
    payload_hash: str
):
    """
    Submit once and track the outcome in Supabase.

    PRECONDITION:
    The order must already be atomically claimed
    and have status 'submitting'.

    This function can place a REAL HHC order
    when live submission is enabled.
    """

    if not is_hhc_live_submission_enabled():
        raise RuntimeError("HHC live orders are disabled")

    try:
        response_data = await execute_hhc_submission(order_payload)
    except (httpx.RequestError, httpx.HTTPStatusError):
        marked = mark_supabase_submission_unknown(
            request_id,
            payload_hash
        )
        if not marked:
            raise RuntimeError(
                "HHC outcome uncertain and Supabase status update failed"
            )
        raise HTTPException(
            status_code=503,
            detail=(
                "HHC submission outcome is uncertain. "
                "Order will not be automatically retried."
            )
        )

    try:
        hhc_order_id = parse_hhc_order_response(response_data)
    except (ValueError, TypeError):
        marked = mark_supabase_submission_unknown(
            request_id,
            payload_hash
        )
        if not marked:
            raise RuntimeError(
                "HHC response unclear and Supabase status update failed"
            )
        raise HTTPException(
            status_code=503,
            detail="HHC response unclear. Order requires manual verification."
        )

    saved = save_supabase_hhc_order_id(
        request_id,
        payload_hash,
        hhc_order_id
    )

    if not saved:
        raise RuntimeError(
            "HHC order may have been created but confirmation could not be saved"
        )

    return {
        "success": True,
        "hhc_order_id": hhc_order_id
    }


async def process_live_hhc_order(
    order_payload: dict,
    request_id: str,
    payload_hash: str
):
    """
    Claim the Supabase order atomically before
    making exactly one HHC submission attempt.

    WARNING:
    This function can place a REAL HHC order
    when live submission is enabled.
    """

    if not is_hhc_live_submission_enabled():
        raise RuntimeError("HHC live orders are disabled")

    claimed = prepare_hhc_order_submission(
        request_id,
        payload_hash
    )

    if not claimed:
        raise HTTPException(
            status_code=409,
            detail=(
                "Order cannot be claimed for submission. "
                "It may already be processing or submitted."
            )
        )

    return await execute_hhc_submission_with_tracking(
        order_payload,
        request_id,
        payload_hash
    )


async def simulate_live_hhc_order(
    order_payload: dict,
    request_id: str,
    payload_hash: str
):
    """
    Simulate live order processing without
    submitting anything to HHC or Supabase.
    """

    return {
        "success": True,
        "simulation": True,
        "request_id": request_id,
        "message": "Live order simulation completed. No supplier order placed."
    }




async def get_hhc_existing_orders():
    """
    Read existing HHC orders for reconciliation.

    This function does NOT create or submit orders.
    """

    if not HHC_API_KEY:
        raise RuntimeError("HHC API key is missing")

    url = (
        "https://api.hhcdropshipping.com"
        "/api/dropshipper/open/orders"
    )

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            url,
            headers=headers
        )
        response.raise_for_status()
        return response.json()


async def get_all_hhc_existing_orders():
    """
    Fetch all pages of existing HHC orders.

    READ ONLY:
    Never creates or submits an HHC order.
    """

    if not HHC_API_KEY:
        raise RuntimeError("HHC API key is missing")

    url = (
        "https://api.hhcdropshipping.com"
        "/api/dropshipper/open/orders"
    )

    headers = {
        "Accept": "application/json",
        "app-key": HHC_API_KEY,
        "User-Agent": "BazaarRetail-Backend/1.0"
    }

    all_orders = []
    page = 1

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            response = await client.get(
                url,
                headers=headers,
                params={"page": page}
            )
            response.raise_for_status()

            result = response.json()

            if not isinstance(result, dict):
                raise ValueError("Invalid HHC orders response")

            orders = result.get("data")

            if not isinstance(orders, list):
                raise ValueError("Invalid HHC orders list")

            returned_page = int(result.get("current_page", 0))
            per_page = int(result.get("per_page", 0))
            total = int(result.get("total", -1))

            if returned_page != page or per_page <= 0 or total < 0:
                raise ValueError("Invalid HHC pagination metadata")

            all_orders.extend(orders)

            if len(all_orders) >= total:
                break

            if not orders:
                raise ValueError(
                    "HHC pagination ended before all orders were fetched"
                )

            page += 1

            if page > 100:
                raise ValueError(
                    "HHC order pagination exceeded safety limit"
                )

    return all_orders


def find_hhc_reconciliation_candidates(
    hhc_orders: list,
    customer_phone: str,
    customer_total: float
):
    """
    Find possible HHC orders for manual reconciliation.

    Matches are NOT proof that an HHC order belongs
    to a particular Bazaar Retail request.

    This function does not modify Supabase
    or submit HHC orders.
    """

    candidates = []

    for hhc_order in hhc_orders:
        if not isinstance(hhc_order, dict):
            continue

        phone_matches = (
            str(hhc_order.get("consignee_phone", "")).strip()
            == str(customer_phone).strip()
        )

        try:
            hhc_sell_price = Decimal(
                str(hhc_order.get("sellPrice"))
            )
            expected_total = Decimal(
                str(customer_total)
            )

            price_matches = (
                hhc_sell_price == expected_total
            )
        except (InvalidOperation, TypeError, ValueError):
            continue

        if phone_matches and price_matches:
            candidates.append({
                "hhc_order_id": hhc_order.get("id"),
                "invoice_id": hhc_order.get("invID"),
                "order_status": hhc_order.get(
                    "order_status_name"
                )
            })

    return candidates


def assess_hhc_reconciliation_candidates(candidates: list):
    """
    Assess possible HHC order matches.

    IMPORTANT:
    Even a single candidate is NOT sufficient
    evidence for automatic confirmation.
    """

    if not candidates:
        return {
            "status": "no_match",
            "requires_manual_review": True,
            "candidate_count": 0
        }

    if len(candidates) == 1:
        return {
            "status": "possible_match",
            "requires_manual_review": True,
            "candidate_count": 1
        }

    return {
        "status": "multiple_matches",
        "requires_manual_review": True,
        "candidate_count": len(candidates)
    }





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

    
    # Register checkout in Supabase before local validation.
    # Real HHC submission remains disabled.
    supabase_registration = register_supabase_order(order)

    if supabase_registration["status"] == "duplicate":
        raise HTTPException(
            status_code=409,
            detail="This order request already exists in Supabase. No new order was created."
        )

    
    # Retrieve the hash stored with this order in Supabase.
    # It is required for the atomic submission claim.
    registered_order = supabase_registration.get("order") or {}

    payload_hash = registered_order.get("payload_hash")

    if not isinstance(payload_hash, str) or not payload_hash:
        raise HTTPException(
            status_code=500,
            detail="Supabase order payload hash is missing"
        )

    # Register this checkout attempt atomically


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
        # HHC product verification failed before order submission.
        supabase_updated = update_supabase_order_status(
            order.request_id,
            "verification_failed"
        )

        if not supabase_updated:
            raise HTTPException(
                status_code=500,
                detail="Unable to record product verification failure"
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
            
            # Record validation failure in Supabase first.
            supabase_updated = update_supabase_order_status(
                order.request_id,
                "validation_failed"
            )

            if not supabase_updated:
                raise HTTPException(
                    status_code=500,
                    detail="Unable to record order validation failure"
                )

            


            raise HTTPException(
                status_code=400,
                detail=f"Product {item.product_id} not found in fetched catalog"
            )


        if (
            int(product.get("quantity") or 0) < item.quantity
            or int(product.get("stockStatus") or 0) != 1
            or str(product.get("product_status", "")).lower() != "publish"
        ):
            
            # Record validation failure in Supabase first.
            supabase_updated = update_supabase_order_status(
                order.request_id,
                "validation_failed"
            )

            if not supabase_updated:
                raise HTTPException(
                    status_code=500,
                    detail="Unable to record order validation failure"
                )

            

            raise HTTPException(
                status_code=400,
                detail=f"Product {item.product_id} is unavailable"
            )

        price = calculate_product_price(product)
        subtotal += price * item.quantity

   
    grand_total = subtotal + SHIPPING_FEE

    # Verify HHC checkout charges before accepting the order.
    # This endpoint only previews charges; it does not place an order.
    try:
        hhc_preview = await get_hhc_checkout_preview(
            products=order.products,
            destination_city=order.destination_city
        )

        hhc_cost_check = validate_hhc_checkout_preview(
            hhc_preview,
            grand_total
        )

    except (httpx.HTTPStatusError, httpx.RequestError, ValueError) as error:
        # Keep the order in verification_failed status so that
        # the same request can be retried safely.
        supabase_updated = update_supabase_order_status(
            order.request_id,
            "verification_failed"
        )

        if not supabase_updated:
            raise HTTPException(
                status_code=500,
                detail="Unable to record HHC checkout verification failure"
            )

        raise HTTPException(
            status_code=502,
            detail="Unable to verify HHC checkout charges"
        )

    # Save the backend-calculated total in Supabase.
    total_saved = save_supabase_order_total(
        order.request_id,
        grand_total
    )

    if not total_saved:
        raise HTTPException(
            status_code=500,
            detail="Unable to save validated order total"
        )

 
    # Live submission branch.
    # SAFETY LOCK: Real HHC orders remain blocked.
    if is_hhc_live_submission_enabled():

        hhc_order_payload = build_hhc_order_payload(
            order,
            grand_total
        )

        # Do not remove this lock until reconciliation,
        # production checks, and controlled activation
        # are complete.
       
        # PRODUCTION SAFETY LOCK
        # Keep this enabled until final reconciliation
        # and end-to-end testing are complete.
        if os.getenv("HHC_PRODUCTION_APPROVED", "false").lower() != "true":
            raise HTTPException(
                status_code=503,
                detail=(
                    "Live HHC submission is awaiting production approval. "
                    "No supplier order was placed."
                )
            )

        return await process_live_hhc_order(
            hhc_order_payload,
            order.request_id,
            payload_hash
        )
 

        # Future live execution (NOT ACTIVE):
        # return await process_live_hhc_order(
        #     hhc_order_payload,
        #     order.request_id,
        #     payload_hash
        # )


    # Atomic claim will be used only after the
    # complete live submission flow is connected.
    # Do not claim an order during test mode.


    # Mark Supabase order as validated in test mode.
    status_saved = update_supabase_order_status(
        order.request_id,
        "validated_test"
    )

    if not status_saved:
        raise HTTPException(
            status_code=500,
            detail="Unable to update Supabase order status"
        )

    
    


    # TEST MODE: no real HHC order submission
    return {
        "success": False,
        "test_mode": True,
        "status": "validated_test",
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


async def find_hhc_product(product_id: int, max_pages: int = 30):
    """
    Search HHC catalog pages for a specific product.
    Read-only: does not create any order.
    """
    for page in range(1, max_pages + 1):
        data = await get_products_by_page(page)
        products = data.get("data", [])

        for product in products:
            if int(product.get("id", 0)) == product_id:
                return product

        if not products:
            break

        current_page = int(data.get("current_page") or page)
        total = data.get("total")
        per_page = data.get("per_page")

        if total is not None and per_page:
            if current_page * int(per_page) >= int(total):
                break

    return None


def prepare_hhc_order_submission(
    request_id: str,
    payload_hash: str
) -> bool:
    """
    Atomically reserve an order for HHC submission.

    Does NOT call HHC or place an order.
    """

    if not request_id or not payload_hash:
        raise ValueError("Missing order submission identifiers")

    claimed = claim_supabase_order(
        request_id,
        payload_hash
    )

    if not claimed:
        return False

    return True



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


def save_supabase_hhc_order_id(
    request_id: str,
    payload_hash: str,
    hhc_order_id: str
) -> bool:
    """
    Atomically save a confirmed HHC Order ID in Supabase.
    Only a submitting order without an HHC ID can be updated.
    """

    if not str(hhc_order_id).strip():
        raise ValueError("HHC Order ID cannot be empty")

    response = supabase.rpc(
        "save_hhc_order_confirmation",
        {
            "p_request_id": request_id,
            "p_payload_hash": payload_hash,
            "p_hhc_order_id": str(hhc_order_id)
        }
    ).execute()

    if not isinstance(response.data, bool):
        raise RuntimeError(
            "Unexpected Supabase HHC confirmation response"
        )

    return response.data


def mark_supabase_submission_unknown(
    request_id: str,
    payload_hash: str
) -> bool:
    """
    Mark an uncertain HHC submission in Supabase.

    Used when an HHC submission times out or its
    outcome cannot be safely determined.

    Does not retry or submit any HHC order.
    """

    response = supabase.rpc(
        "mark_hhc_submission_unknown",
        {
            "p_request_id": request_id,
            "p_payload_hash": payload_hash
        }
    ).execute()

    if not isinstance(response.data, bool):
        raise RuntimeError(
            "Unexpected Supabase submission status response"
        )

    return response.data


def get_supabase_uncertain_orders():
    """
    Retrieve orders requiring manual reconciliation.

    READ ONLY:
    Does not update order statuses or submit HHC orders.
    """

    response = (
        supabase.table("orders")
        .select(
            "id,request_id,status,payload_hash,"
            "hhc_order_id,total_amount,created_at,updated_at"
        )
        .in_("status", ["submission_unknown", "submitting"])
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )

    return response.data or []





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



