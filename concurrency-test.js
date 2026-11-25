const BASE_URL = "http://localhost:5001/api/transfers";

const sender = "40ec0433-3e52-4ae8-a235-c02b921cc899";
const receiver = "a71b73f8-4af8-4053-a167-2e1e1b90afff";

async function transfer(key) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from_wallet_id: sender,
      to_wallet_id: receiver,
      amount: 100,
      idempotency_key: key
    })
  });

  return {
    key,
    status: response.status,
    body: await response.json()
  };
}

async function main() {
  const results = await Promise.all([
    transfer("parallel-test-A"),
    transfer("parallel-test-B")
  ]);

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
