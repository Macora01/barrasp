import os
import csv
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)


def get_session_file(email: str) -> str:
    ensure_data_dir()
    today = datetime.now().strftime("%Y%m%d")
    safe_email = email.replace("@", "_at_").replace(".", "_")
    base_pattern = f"{today}_{safe_email}"

    existing = [
        f for f in os.listdir(DATA_DIR)
        if f.startswith(base_pattern) and f.endswith(".csv")
    ]
    session_number = len(existing) + 1
    filename = f"{base_pattern}_{session_number}.csv"
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "code", "email", "session_file"])

    return filepath


@app.route("/", methods=["GET"])
def home():
    email = session.get("email")
    if not email:
        return redirect(url_for("login"))
    return redirect(url_for("scanner"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        if not email:
            return render_template("login.html", error="Debes ingresar un correo.")
        if "@" not in email or "." not in email:
            return render_template("login.html", error="Correo no válido.", email=email)

        session["email"] = email
        session.pop("session_file", None)
        return redirect(url_for("scanner"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/scanner")
def scanner():
    email = session.get("email")
    if not email:
        return redirect(url_for("login"))

    session_file = session.get("session_file")
    if not session_file:
        session_file = get_session_file(email)
        session["session_file"] = session_file

    filename = os.path.basename(session_file)
    return render_template("index.html", email=email, session_filename=filename)


@app.route("/api/add-scan", methods=["POST"])
def add_scan():
    email = session.get("email")
    if not email:
        return jsonify({"ok": False, "error": "Sesión no válida"}), 401

    data = request.get_json(silent=True) or {}
    code = data.get("code", "").strip()
    if not code:
        return jsonify({"ok": False, "error": "Código vacío"}), 400

    session_file = session.get("session_file")
    if not session_file:
        session_file = get_session_file(email)
        session["session_file"] = session_file

    timestamp = datetime.now().isoformat(timespec="seconds")

    ensure_data_dir()
    with open(session_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, code, email, os.path.basename(session_file)])

    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5008, debug=True)
