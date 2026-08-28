import re
import sys
import os

def check_api_contract():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    js_file = os.path.join(base_dir, 'src', 'services', 'adminer-api.js')
    php_file = os.path.join(base_dir, 'plugin', 'local_adminer_api', 'db', 'services.php')

    with open(js_file, 'r') as f:
        js_content = f.read()
    
    with open(php_file, 'r') as f:
        php_content = f.read()

    js_endpoints = re.findall(r"MoodleApi\.call\(['\"]([^'\"]+)['\"]", js_content)
    js_endpoints = set(js_endpoints)

    php_defined = re.findall(r"'([^']+)'\s*=>\s*\[\s*'classname'", php_content)
    php_defined = set(php_defined)

    php_registered_match = re.search(r"'functions'\s*=>\s*\[(.*?)\]", php_content, re.DOTALL)
    php_registered = []
    if php_registered_match:
        php_registered = re.findall(r"'([^']+)'", php_registered_match.group(1))
    php_registered = set(php_registered)

    errors = []

    for ep in js_endpoints:
        if ep not in php_defined:
            # Maybe it's a core WS function like core_webservice_get_site_info
            if not ep.startswith('local_adminer_'):
                continue
            errors.append(f"JS calls endpoint '{ep}' which is not defined in services.php ($functions array).")
        if ep not in php_registered:
            errors.append(f"JS calls endpoint '{ep}' which is not registered in services.php ($services array).")

    if errors:
        print("API Contract Test FAILED:")
        for err in errors:
            print(" - " + err)
        sys.exit(1)
    else:
        print("API Contract Test PASSED.")
        sys.exit(0)

if __name__ == "__main__":
    check_api_contract()
