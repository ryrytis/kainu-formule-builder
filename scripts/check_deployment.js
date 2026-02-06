
async function check() {
    console.log("Checking deployment status...");
    try {
        const res = await fetch('https://kainu-crm.vercel.app/api/client_proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await res.json();
        console.log("Status Code:", res.status);
        console.log("Response Body:", data);

        if (data.error && data.error.includes("VERIFIED")) {
            console.log("SUCCESS: New code is live!");
        } else {
            console.log("FAIL: Old code is still running.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

check();
