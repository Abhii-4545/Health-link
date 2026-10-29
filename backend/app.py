"""
HealthLink ABHA — Python Flask + MySQL + Gemini API Backend
Project: ABHA-Based Inter-Hospital Medical Record Exchange
"""

import os
import json
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

try:
    import pandas as pd
    import numpy as np
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

SESSION_SECRET = os.getenv("SESSION_SECRET", "healthlink-default-dev-secret-change-in-prod")
ADMIN_SETUP_KEY = os.getenv("ADMIN_SETUP_KEY", "HEALTHLINK-ADMIN-SETUP")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def get_db_connection():
    """Creates a parameterized MySQL connection."""
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "healthlink_user"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "healthlink_abha_db"),
        autocommit=False,
    )


def create_signed_token(user_id: str, role: str) -> str:
    payload = f"{user_id}:{role}:{int(datetime.now(timezone.utc).timestamp())}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_signed_token(token: str):
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return None
        user_id, role, ts_str, sig = parts
        payload = f"{user_id}:{role}:{ts_str}"
        expected = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        if int(datetime.now(timezone.utc).timestamp()) - int(ts_str) > 86400 * 7:
            return None
        return {"userId": user_id, "role": role}
    except Exception:
        return None


def require_auth(allowed_roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Authentication required."}), 401
            token = auth_header.replace("Bearer ", "", 1).strip()
            claims = verify_signed_token(token)
            if not claims:
                return jsonify({"error": "Invalid or expired session token."}), 401
            if allowed_roles and claims["role"] not in allowed_roles:
                return jsonify({"error": "Insufficient role permissions."}), 403
            request.current_user = claims
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def compute_record_statistics_with_pandas(records: list) -> dict:
    """Uses Pandas and NumPy to aggregate authorized clinical record distribution."""
    if not records:
        return {"total": 0, "byCategory": {}, "byFacility": {}}
    if PANDAS_AVAILABLE:
        df = pd.DataFrame(records)
        cat_counts = df["category"].value_counts().to_dict() if "category" in df else {}
        fac_counts = df["facilityName"].value_counts().to_dict() if "facilityName" in df else {}
        sizes = df["fileSizeBytes"].to_numpy() if "fileSizeBytes" in df else np.array([0])
        return {
            "total": int(len(df)),
            "byCategory": {str(k): int(v) for k, v in cat_counts.items()},
            "byFacility": {str(k): int(v) for k, v in fac_counts.items()},
            "meanSizeBytes": float(np.mean(sizes)) if len(sizes) > 0 else 0.0,
        }
    return {"total": len(records)}


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "HealthLink ABHA Flask REST API",
        "pandasEnabled": PANDAS_AVAILABLE,
        "aiConfigured": bool(GEMINI_API_KEY and GEMINI_API_KEY != "MY_GEMINI_API_KEY"),
    })


@app.route("/api/summaries/generate", methods=["POST"])
@require_auth(allowed_roles=["doctor", "patient"])
def generate_ai_summary():
    """
    Processes ONLY authorized patient medical records and generates a structured
    clinical summary using Gemini API (`gemini-3.8-flash`).
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "MY_GEMINI_API_KEY" or not GENAI_AVAILABLE:
        return jsonify({
            "error": "AI Summarization requires a configured GEMINI_API_KEY in server environment variables."
        }), 503

    body = request.get_json(silent=True) or {}
    authorized_records = body.get("authorizedRecords", [])
    if not authorized_records:
        return jsonify({"error": "No authorized medical records available to summarize."}), 400

    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt_docs = "\n\n".join([
        f"Document ID: {r.get('id')}\nTitle: {r.get('title')}\nCategory: {r.get('category')}\n"
        f"Facility: {r.get('facilityName')}\nDate: {r.get('recordDate')}\n"
        f"Clinical Content: {r.get('clinicalTextContent')}"
        for r in authorized_records
    ])

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=(
            "Summarize the following authorized medical records strictly based on the source text. "
            "Do NOT invent or extrapolate any diagnoses, medications, allergies, or test results.\n\n"
            + prompt_docs
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    return jsonify({"summary": json.loads(response.text), "modelUsed": "gemini-3.8-flash"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
