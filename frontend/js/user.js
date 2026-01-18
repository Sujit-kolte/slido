let code = "";
let locked = false;

async function join() {
  code = joinCode.value;
  await api(`/sessions/${code}/join`, "POST");

  socket.connect();
  socket.emit("join-session", code);

  joinDiv(false);
}

socket.on("session:started", () => {
  document.getElementById("question").innerText = "Session Started";
});

socket.on("question:new", (q) => {
  document.getElementById("question").innerText = q.question;
  options.innerHTML = "";
  locked = false;

  for (let k in q.options) {
    const btn = document.createElement("button");
    btn.innerText = q.options[k];
    btn.onclick = () => submit(k);
    options.appendChild(btn);
  }
});

async function submit(option) {
  if (locked) return;

  const res = await api("/answers", "POST", {
    sessionCode: code,
    option,
  });

  result.innerText = res.correct ? "Correct ✅" : "Incorrect ❌";
  locked = true;
}

function joinDiv(joined) {
  join.classList.toggle("hidden", joined);
  live.classList.toggle("hidden", !joined);
}
