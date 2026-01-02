let entity_id;
let cachedFile = null;

function showModal(title, message, isSuccess = true) {
    const modal = document.getElementById('notification-modal');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const closeBtn = document.getElementById('modal-close-btn');

    titleEl.innerText = title;
    titleEl.className = `text-xl font-bold mb-3 ${isSuccess ? 'text-green-600' : 'text-red-600'}`;
    msgEl.innerText = message;

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);

    closeBtn.onclick = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
            if (isSuccess) ZOHO.CRM.UI.Popup.closeReload();
        }, 300);
    };
}

function updateUI() {
    const type = document.getElementById('account_type').value;
    const reason = document.getElementById('reason').value;
    const agent = document.getElementById('agent_name').value.trim();
    const rems = document.getElementById('remarks').value.trim();

    const containers = {
        submit: document.getElementById('submit-container'),
        upload: document.getElementById('upload-container'),
        remarks: document.getElementById('remarks-container'),
        reason: document.getElementById('reason-container'),
        agent: document.getElementById('agent-container')
    };

    Object.values(containers).forEach(c => c.classList.add('hidden'));

    if (type === "Transferred to Authority") {
        containers.reason.classList.remove('hidden');
        if (reason === "Client's Request") {
            containers.remarks.classList.remove('hidden');
            containers.upload.classList.remove('hidden');
            if (rems !== "" && cachedFile !== null) containers.submit.classList.remove('hidden');
        } else if (reason) {
            containers.submit.classList.remove('hidden');
        }
    } else if (type === "Transferred to Competitor") {
        containers.agent.classList.remove('hidden');
        if (agent !== "") {
            containers.upload.classList.remove('hidden');
            if (cachedFile !== null) containers.submit.classList.remove('hidden');
        }
    } else if (type && type.includes("Warning")) {
        containers.submit.classList.remove('hidden');
    }
}

async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) {
        cachedFile = null;
        updateUI();
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showModal('Error', 'File size must not exceed 20MB.', false);
        e.target.value = "";
        cachedFile = null;
        return;
    }

    cachedFile = file;
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) fileNameDisplay.innerText = `Selected: ${file.name}`;
    updateUI();
}

ZOHO.embeddedApp.on("PageLoad", (e) => { 
    entity_id = e.EntityId[0]; 
});

ZOHO.embeddedApp.init().then(() => {
    const inputs = ['account_type', 'reason', 'agent_name', 'remarks'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateUI);
    });

    document.getElementById('tlz-noc-document').addEventListener('change', handleFile);

    document.getElementById('submit_btn').addEventListener('click', async function() {
        const btnText = document.getElementById('button-text');
        const spinner = document.getElementById('loading-spinner');
        const selectedType = document.getElementById('account_type').value;
        
        this.disabled = true;
        btnText.innerText = "Processing...";
        spinner.classList.remove('hidden');

        try {
            let fileId = null;

            if (cachedFile) {
                const config = {
                    "CONTENT_TYPE": "multipart",
                    "PARTS": [{ "headers": { "Content-Disposition": "file;" }, "content": "__FILE__" }],
                    "FILE": { "fileParam": "content", "file": cachedFile }
                };
                const resp = await ZOHO.CRM.API.uploadFile(config);
                fileId = resp.data[0].details.id;
            }

            const func_data = {
                "arguments": JSON.stringify({
                    "account_id": entity_id,
                    "transfer_type": selectedType,
                    "transferred_to_auth_reason": document.getElementById('reason').value,
                    "competitor_agent_name": document.getElementById('agent_name').value,
                    "transfer_reason": document.getElementById('remarks').value
                })
            };
            await ZOHO.CRM.FUNCTIONS.execute("transfer_account_and_reminder", func_data);

            if (fileId) {
                await ZOHO.CRM.API.updateRecord({
                    Entity: "Accounts",
                    APIData: { "id": entity_id, "TLZ_NOC_document": [fileId] },
                    Trigger: ["workflow"]
                });
            }

            // --- Custom Success Messages for all Account Types ---
            let successMessage = "";
            
            switch (selectedType) {
                case "Send First Warning":
                    successMessage = "The Send First Warning email has been successfully triggered.";
                    break;
                case "Send Final Warning":
                    successMessage = "The Send Final Warning email has been successfully triggered.";
                    break;
                case "Transferred to Authority":
                    successMessage = "The account has been successfully transferred to the Authority.";
                    break;
                case "Transferred to Competitor":
                    successMessage = "The account has been successfully transferred to a Competitor.";
                    break;
                default:
                    successMessage = "The account update has been processed successfully.";
            }

            showModal('Success', successMessage, true);

        } catch (err) {
            showModal('Error', 'Failed to update record. Please check your connection.', false);
            this.disabled = false;
            btnText.innerText = "Confirm Transfer";
            spinner.classList.add('hidden');
        }
    });
});