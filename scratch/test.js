import http from 'http';

const postData = JSON.stringify([
  {
    "index": 0,
    "methodname": "local_adminer_course_cohort_action",
    "args": {
      "action": "add",
      "courseid": 2, // Assuming course 2 exists, wait, I can use process.argv
      "cohortids": [1] // Assuming cohort 1 exists
    }
  }
]);

const options = {
  hostname: 'localhost',
  port: 8888, // Wait, I don't know the port. Let's just use localhost:3001 and see if Vite proxies it.
  path: '/moodle/lib/ajax/service.php?sesskey=12345&info=local_adminer_course_cohort_action',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
