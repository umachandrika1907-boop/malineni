"""
EduSuccessAI - Secure Admin User Setup & Password Management CLI
Usage:
    python seed/create_admin.py
    python seed/create_admin.py --email myemail@univ.edu --password MySecurePassword123!
"""
import sys
import os
import argparse
import getpass

# Add backend directory to sys.path so app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, create_tables
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.schemas.auth import UserCreate
from app.services.auth_service import AuthService


def main():
    parser = argparse.ArgumentParser(description="Create or manage administrator accounts for EduSuccessAI.")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--password", help="Administrator password (min 8 chars)")
    parser.add_argument("--role", default="ADMIN", choices=["ADMIN", "FACULTY", "COUNSELOR", "STUDENT"], help="Account role (default: ADMIN)")
    parser.add_argument("--dept", default=None, help="Department (optional)")
    args = parser.parse_args()

    create_tables()
    db = SessionLocal()

    try:
        # Check existing admin accounts
        existing_admins = db.query(User).filter(User.role == "ADMIN").all()

        print("\n=======================================================")
        print("          EduSuccessAI Administrator Setup             ")
        print("=======================================================")

        if existing_admins:
            print("[i] Existing administrator account(s) in database:")
            for admin_user in existing_admins:
                print(f"    - {admin_user.email} (Active: {admin_user.is_active})")
            print("-------------------------------------------------------")

        email = (
            args.email
            or os.getenv("INITIAL_ADMIN_EMAIL")
            or settings.initial_admin_email
        )

        if not email:
            prompt_default = existing_admins[0].email if existing_admins else "admin@edusuccess.edu"
            entered = input(f"Enter admin email to create or update [{prompt_default}]: ").strip()
            email = entered or prompt_default

        target_user = db.query(User).filter(User.email == email).first()

        password = (
            args.password
            or os.getenv("INITIAL_ADMIN_PASSWORD")
            or settings.initial_admin_password
        )

        if password:
            if len(password) < 8:
                print("[-] Error: Password must be at least 8 characters.")
                return
            if len(password.encode("utf-8")) > 72:
                print("[-] Error: Password cannot exceed 72 bytes due to bcrypt limitation.")
                return

        if target_user:
            print(f"\n[!] User '{email}' already exists in database (Role: {target_user.role}).")
            if not password:
                confirm = input("Do you want to set a new password for this account? (Y/n): ").strip().lower()
                if confirm == "n":
                    print("[*] No changes made.")
                    return
                while True:
                    password = getpass.getpass("Enter new password (min 8 characters): ")
                    if len(password) < 8:
                        print("[-] Password must be at least 8 characters.")
                        continue
                    confirm_pwd = getpass.getpass("Confirm new password: ")
                    if password != confirm_pwd:
                        print("[-] Passwords do not match. Please try again.")
                        continue
                    break

            target_user.hashed_password = hash_password(password)
            target_user.role = "ADMIN"
            target_user.is_active = True
            db.commit()

            print(f"\n[+] SUCCESS: Password updated for administrator '{email}'.")
            print("    You can now log in at http://localhost:5173 with this email and your password.\n")
            return

        # User does not exist, create new
        if not password:
            while True:
                password = getpass.getpass(f"Enter password for '{email}' (min 8 characters): ")
                if len(password) < 8:
                    print("[-] Password must be at least 8 characters.")
                    continue
                confirm_pwd = getpass.getpass("Confirm password: ")
                if password != confirm_pwd:
                    print("[-] Passwords do not match. Please try again.")
                    continue
                break

        user_data = UserCreate(
            email=email,
            password=password,
            role=args.role,
            department=args.dept,
        )

        created_user = AuthService.create_user(db, user_data)
        print(f"\n[+] SUCCESS: Administrator account created successfully!")
        print(f"    Email:  {created_user.email}")
        print(f"    Role:   {created_user.role}")
        print(f"    Active: {created_user.is_active}")
        print("\n    You can now log in at http://localhost:5173 with this email and password.\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
