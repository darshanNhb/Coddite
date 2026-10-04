import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },
    { duration: '10s', target: 20 },
    { duration: '5s', target: 0 },
  ],
};

export default function () {
  // Using a fake communityId for feed test
  const res = http.get('http://host.docker.internal:4000/api/v1/posts?communityId=00000000-0000-0000-0000-000000000000', {
    headers: { 'X-Test-Bypass-Rate-Limit': 'true' }
  });
  
  check(res, {
    'status is 200 or 404 (if not found)': (r) => r.status === 200 || r.status === 404,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
