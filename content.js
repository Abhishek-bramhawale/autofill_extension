// alert('Content script loaded!');

function fillSimpleAutofillFields(data) {
  let filled = 0;
  // console.log('Autofill: Received data:', data);
  // alert('Autofill: Received data: ' + JSON.stringify(data));
  if (data.name) {
    const nameInputs = document.querySelectorAll('input[name="name"]');
    // console.log('Autofill: Found', nameInputs.length, 'name inputs');
    // alert('Autofill: Found ' + nameInputs.length + ' name inputs');
    nameInputs.forEach(el => {
      el.value = data.name;
      ['input', 'change', 'blur'].forEach(eventType => {
        el.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      filled++;
      // console.log('Autofill: Filled name input with', data.name);
      // alert('Autofill: Filled name input with ' + data.name);
    });
  }
  // if (data.age) {

  if (data.city) {
    const cityInputs = document.querySelectorAll('input[name="city"]');
    // console.log('Autofill: Found', cityInputs.length, 'city inputs');
    // alert('Autofill: Found ' + cityInputs.length + ' city inputs');
    cityInputs.forEach(el => {
      el.value = data.city;
      ['input', 'change', 'blur'].forEach(eventType => {
        el.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      filled++;
      // console.log('Autofill: Filled city input with', data.city);
      // alert('Autofill: Filled city input with ' + data.city);
    });
  }
  // alert('Autofill: Total fields filled: ' + filled);
  // console.log('Autofill: Total fields filled:', filled);
  return filled;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('Autofill: Message received', message);
  // alert('Autofill: Message received: ' + JSON.stringify(message));
  if (message.type === 'AUTOFILL' && message.data) {
    const filled = fillSimpleAutofillFields(message.data);
    sendResponse({ success: true, filledFields: filled });
    // alert('Autofill: Done, fields filled: ' + filled);
    return true;
  }
}); 