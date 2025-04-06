window.onload = async () => {
    const res = await fetch('/username');
    const data = await res.json();
    document.getElementById('username').textContent = data.username;
  };
  