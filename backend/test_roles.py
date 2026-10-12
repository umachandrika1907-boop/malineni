import requests

base_url = 'http://127.0.0.1:8000'

# 1. Student Login & Profile & Marks
print("=== 1. Testing Student Account ===")
s_res = requests.post(f"{base_url}/api/v1/auth/login", json={'email': 'kalyani05942@gmail.com', 'password': 'Student@12345'})
assert s_res.status_code == 200, f"Student login failed: {s_res.text}"
s_data = s_res.json()
print("Student logged in:", s_data['user']['email'], "Role:", s_data['user']['role'])

token = s_data['access_token']
headers = {'Authorization': f'Bearer {token}'}

me_res = requests.get(f"{base_url}/api/v1/students/me", headers=headers)
assert me_res.status_code == 200, f"Student /me failed: {me_res.text}"
student_profile = me_res.json()['data']
print("Student Profile Loaded:", student_profile['full_name'], student_profile['student_id_str'], "Score:", student_profile['total_score'], "Risk:", student_profile['risk_segment'])

marks_res = requests.get(f"{base_url}/api/v1/students/{student_profile['id']}/marks", headers=headers)
assert marks_res.status_code == 200, f"Student marks failed: {marks_res.text}"
print("Student Courses & Marks:", len(marks_res.json()['data']), "subjects loaded.")

# 2. Faculty Login & Department Student Listing & Marks Addition
print("\n=== 2. Testing Faculty Account ===")
f_res = requests.post(f"{base_url}/api/v1/auth/login", json={'email': 'faculty.cse@edusuccess.edu', 'password': 'Faculty@12345'})
assert f_res.status_code == 200, f"Faculty login failed: {f_res.text}"
f_data = f_res.json()
print("Faculty logged in:", f_data['user']['email'], "Role:", f_data['user']['role'], "Department:", f_data['user']['department'])

f_token = f_data['access_token']
f_headers = {'Authorization': f'Bearer {f_token}'}

dept_res = requests.get(f"{base_url}/api/v1/students", headers=f_headers)
assert dept_res.status_code == 200, f"Faculty students listing failed: {dept_res.text}"
print("Faculty sees department students count:", dept_res.json()['meta']['total'])

# Test adding marks as faculty
add_marks_res = requests.post(
    f"{base_url}/api/v1/students/{student_profile['id']}/marks",
    headers=f_headers,
    json={
        'subject_code': 'CS506',
        'subject_name': 'Cybersecurity Fundamentals',
        'semester': 5,
        'academic_year': '2025-26',
        'marks_obtained': 90.0,
        'max_marks': 100.0,
    }
)
assert add_marks_res.status_code == 201, f"Faculty adding mark failed: {add_marks_res.text}"
print("Faculty added marks successfully:", add_marks_res.json()['message'])

# 3. Admin Login
print("\n=== 3. Testing Admin Account ===")
a_res = requests.post(f"{base_url}/api/v1/auth/login", json={'email': 'admin@edusuccess.edu', 'password': 'Admin@12345'})
assert a_res.status_code == 200, f"Admin login failed: {a_res.text}"
print("Admin logged in successfully:", a_res.json()['user']['email'], "Role:", a_res.json()['user']['role'])

print("\nALL ROLE-BASED FLOWS PASSED VERIFICATION!")
