let entity_id;

ZOHO.embeddedApp.on("PageLoad", async (entity)  => {
    entity_id = entity.EntityId[0];
    console.log("Entity ID: " + entity_id)

    const account_response = await ZOHO.CRM.API.getRecord({
        Entity: "Accounts", approved: "both", RecordID: entity_id
    });
    const account_data = account_response.data[0];
    account_type = account_data.Account_Type;
    console.log("ACCOUNT TYPE: ", account_type);
})

ZOHO.embeddedApp.init().then(() => {
  const accountTypeSelect = document.getElementById('account_type');
  const reasonField = document.getElementById('reason').closest('.field-group');
  const agentField = document.getElementById('agent_name').closest('.field-group');
  const submitBtnContainer = document.querySelector('.button-container');

  // Initial State: Hide everything except Account Type
  reasonField.classList.add('hidden');
  agentField.classList.add('hidden');
  submitBtnContainer.classList.add('hidden');

  // Listen for changes on Account Type
  accountTypeSelect.addEventListener('change', function () {
    const selectedValue = this.value;

    // Reset visibility
    reasonField.classList.add('hidden');
    agentField.classList.add('hidden');
    submitBtnContainer.classList.add('hidden');

    if (selectedValue === "Transferred to Authority") {
      // Show Reason and Button
      reasonField.classList.remove('hidden');
      submitBtnContainer.classList.remove('hidden');
    } 
    else if (selectedValue === "Transferred to Competitor") {
      // Show Competitor Name and Button
      agentField.classList.remove('hidden');
      submitBtnContainer.classList.remove('hidden');
    } 
    else if (selectedValue === "Send First Warning" || selectedValue === "Send Final Warning") {
      // Show only Button
      submitBtnContainer.classList.remove('hidden');
    }
  });
});

ZOHO.embeddedApp.init();