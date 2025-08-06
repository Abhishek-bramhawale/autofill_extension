// alert('Content script loaded!');

function fillMappedAutofillFields(data) {
  let filled = 0;
  
  Object.entries(data).forEach(([fieldName, value]) => {
    const selectors = [
      `input[name="${fieldName}"]`, `input[id="${fieldName}"]`,
      `textarea[name="${fieldName}"]`, `textarea[id="${fieldName}"]`,
      `select[name="${fieldName}"]`, `select[id="${fieldName}"]`,
      `input[class*="${fieldName}"]`, `textarea[class*="${fieldName}"]`,
      `input[placeholder*="${fieldName}"]`, `textarea[placeholder*="${fieldName}"]`
    ];
    
    let inputs = document.querySelectorAll(selectors.join(', '));
    
    if (inputs.length === 0) {
      const allInputs = document.querySelectorAll('input, textarea, select');
      inputs = Array.from(allInputs).filter(input => {
        let labelText = '';
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) labelText = label.textContent.toLowerCase();
        }
        if (!labelText) {
          const parentLabel = input.closest('label');
          if (parentLabel) labelText = parentLabel.textContent.toLowerCase();
        }
        return labelText.includes(fieldName.toLowerCase()) || fieldName.toLowerCase().includes(labelText);
      });
    }
    
    inputs.forEach(el => {
      if (!el.value?.trim()) {
        el.value = value;
        ['input', 'change', 'blur'].forEach(eventType => {
          el.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        filled++;
      }
    });
  });
  
  return filled;
}

function getFormFieldsMetadata() {
  const inputs = document.querySelectorAll('input, select, textarea');
  return Array.from(inputs).map(input => {
    let label = '';
    if (input.id) {
      const labelEl = document.querySelector(`label[for="${input.id}"]`);
      if (labelEl) label = labelEl.innerText;
    }
    if (!label) {
      const parentLabel = input.closest('label');
      if (parentLabel) label = parentLabel.innerText;
    }
    
    return {
      name: input.name || '',
      id: input.id || '',
      placeholder: input.placeholder || '',
      label: label.replace(/\s+/g, ' ').trim(),
      type: input.type || 'text'
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TEST') {
    sendResponse({ success: true, message: 'Content script is working' });
    return true;
  }
  
  if (message.type === 'AUTOFILL' && message.data) {
    const isAIMapped = message.data && Object.keys(message.data).some(key => 
      key.includes('-') || key.includes('_') || key.length > 10
    );
    
    const filled = fillMappedAutofillFields(message.data);
    sendResponse({ 
      success: true, 
      filledFields: filled,
      method: isAIMapped ? 'ai-mapped' : 'direct-matching'
    });
    return true;
  }
  
  if (message.type === 'GET_FIELDS_METADATA') {
    sendResponse({ fields: getFormFieldsMetadata() });
    return true;
  }
  
  return false;
}); 