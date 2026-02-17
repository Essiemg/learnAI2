
import requests
import sys

BASE_URL = "http://localhost:8000/api"

def test_auth_failure():
    print("Test 1: No Token")
    try:
        resp = requests.post(f"{BASE_URL}/quizzes/generate", json={"topic": "Math", "num_questions": 3})
        print(f"Status: {resp.status_code}, Body: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

    print("\nTest 2: Invalid Token")
    try:
        headers = {"Authorization": "Bearer invalid_token"}
        resp = requests.post(f"{BASE_URL}/quizzes/generate", json={"topic": "Math", "num_questions": 3}, headers=headers)
        print(f"Status: {resp.status_code}, Body: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth_failure()
