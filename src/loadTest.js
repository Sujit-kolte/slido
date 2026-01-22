import fetch from "node-fetch";

const URL = "hhttps://gdg-quiz-app.onrender.com/api/participants/join";
const SESSION_CODE = "TEST1";
const TOTAL_REQUESTS = 300;

async function sendRequest(i) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionCode: SESSION_CODE,
      name: `User_${i}`
    })
  });

  return res.status;
}

async function runTest() {
  console.time("LOAD_TEST");

  const promises = [];
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    promises.push(sendRequest(i));
  }

  const results = await Promise.allSettled(promises);

  const success = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  console.timeEnd("LOAD_TEST");
  console.log("✅ Success:", success);
  console.log("❌ Failed:", failed);
}

runTest();
