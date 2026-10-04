import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    email: `test-${__VU}-${__ITER}@example.com`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Bypass-Rate-Limit': 'true'
    },
  };

  const res = http.post('http://host.docker.internal:4000/api/v1/auth/signup', payload, params);
  if (res.status !== 200) console.log('ERROR:', res.status, res.body);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'latency < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
