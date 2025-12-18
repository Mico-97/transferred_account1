let entity_id;
let cachedFile = null;

function showUploadBuffer() { document.getElementById('upload-buffer').classList.remove('hidden'); }
function hideUploadBuffer() { document.getElementById('upload-buffer').classList.add('hidden'); }


function updateSubmitButtonVisibility() {
    const transferType = document.getElementById('account_type').value;
    const reason = document.getElementById('reason').value;
    const competitorName = document.getElementById('agent_name').value.trim();
    const submitBtnContainer = document.getElementById('submit-container');
    const uploadGroup = document.getElementById('upload-container');

    submitBtnContainer.classList.add('hidden');

    if (transferType === "Transferred to Authority") {
        if (reason === "Client's Request") {
            uploadGroup.classList.remove('hidden');
            if (cachedFile !== null) submitBtnContainer.classList.remove('hidden');
        } else if (reason !== "" && reason !== null) {
            uploadGroup.classList.add('hidden');
            submitBtnContainer.classList.remove('hidden');
        }
    } 
    else if (transferType === "Transferred to Competitor") {
        if (competitorName !== "") {
            uploadGroup.classList.remove('hidden');
            if (cachedFile !== null) submitBtnContainer.classList.remove('hidden');
        } else {
            uploadGroup.classList.add('hidden');
        }
    }
    else if (transferType && transferType.includes("Warning")) {
        uploadGroup.classList.add('hidden');
        submitBtnContainer.classList.remove('hidden');
    }
}

async function cacheFileOnChange(event) {
    const fileInput = event.target;
    const file = fileInput?.files[0];
    
    if (!file) {
        cachedFile = null;
        updateSubmitButtonVisibility();
        return;
    }

    showUploadBuffer();

    // 10MB Limit
    if (file.size > 10 * 1024 * 1024) {
        alert("File size must not exceed 10MB.");
        fileInput.value = "";
        cachedFile = null;
        setTimeout(hideUploadBuffer, 500);
        return;
    }

    cachedFile = file;

    await new Promise((res) => setTimeout(res, 2200)); 
    hideUploadBuffer();
    updateSubmitButtonVisibility();
}

ZOHO.embeddedApp.on("PageLoad", async (entity) => {
    entity_id = entity.EntityId[0];
});

ZOHO.embeddedApp.init().then(() => {
    const accountTypeSelect = document.getElementById('account_type');
    const reasonSelect = document.getElementById('reason');
    const fileInput = document.getElementById('tlz-noc-document');
    const agentInput = document.getElementById('agent_name');
    const submitBtn = document.getElementById('submit_btn');

    accountTypeSelect.addEventListener('change', () => {
        document.getElementById('reason-container').classList.add('hidden');
        document.getElementById('upload-container').classList.add('hidden');
        document.getElementById('agent-container').classList.add('hidden');
        
        reasonSelect.value = "";
        fileInput.value = "";
        agentInput.value = "";
        cachedFile = null;

        if (accountTypeSelect.value === "Transferred to Authority") document.getElementById('reason-container').classList.remove('hidden');
        if (accountTypeSelect.value === "Transferred to Competitor") document.getElementById('agent-container').classList.remove('hidden');
        updateSubmitButtonVisibility();
    });

    reasonSelect.addEventListener('change', updateSubmitButtonVisibility);
    agentInput.addEventListener('input', updateSubmitButtonVisibility);
    fileInput.addEventListener('change', cacheFileOnChange);

    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";
        
        try {
            let uploadedFileId = null;

            // 1. Upload File to Zoho to get the ID (Required for File Upload fields)
            if (cachedFile) {
                const config = {
                    "CONTENT_TYPE": "multipart",
                    "PARTS": [{
                        "headers": { "Content-Disposition": "file;" },
                        "content": "__FILE__"
                    }],
                    "FILE": {
                        "fileParam": "content",
                        "file": cachedFile
                    }
                };

                const uploadResponse = await ZOHO.CRM.API.uploadFile(config);
                // Extracting the ID from the response details
                uploadedFileId = uploadResponse.data[0].details.id;
            }

            // 2. Prepare Data for record update
            const updatePayload = {
                "id": entity_id,
                "Transfer_Type": accountTypeSelect.value,
                "Transferred_to_Authority_Reason": reasonSelect.value,
                "Competitor_Agent_Name": agentInput.value
            };

            // 3. Link the ID to the specific field name
            if (uploadedFileId) {
                // IMPORTANT: File fields in Zoho must be an array of IDs [id1, id2]
                updatePayload["TLZ_NOC_document"] = [uploadedFileId];
            }

            // 4. Final Record Update
            await ZOHO.CRM.API.updateRecord({
                Entity: "Accounts",
                APIData: updatePayload
            });

            ZOHO.CRM.UI.Popup.closeReload();
            
        } catch (error) {
            console.error("Submission Error: ", error);
            alert("Error updating record. Please check the console.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Update";
        }
    });
});

ZOHO.embeddedApp.init();