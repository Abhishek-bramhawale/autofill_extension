import './App.css'

import { useEffect, useState } from "react";

function App() {

  const [form, setForm] = useState({ 
    name: "", 
    phone: "",
    city: "",
    email: "" 
    
   
  });

  const [status, setStatus] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  useEffect(() => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get([
        "name", "phone", "city", "email"], (result) => {
        setForm({
          name: result.name || "",
          phone: result.phone || "",
          city: result.city || "",
          email: result.email || "",
          
        });
      });
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let chromeSaved = false;
    let localSaved = false;
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.set(form, () => {
        chromeSaved = true;
        if (localSaved) {
          window.alert("Data saved successfully!");
        }
      });
    }
    localStorage.setItem('autofillDetails', JSON.stringify(form));
    localSaved = true;
    if (!window.chrome?.storage?.local || chromeSaved) {
      window.alert("Data saved successfully!");
    }
  };

  const contentScriptCode = `
function fillFields(data) {
  if (data.name) document.querySelectorAll('input[name="name"]').forEach(el => el.value = data.name);
  if (data.city) document.querySelectorAll('input[name="city"]').forEach(el => el.value = data.city);
  if (data.phone) document.querySelectorAll('input[name="phone"]').forEach(el => el.value = data.phone);
  if (data.email) document.querySelectorAll('input[name="email"]').forEach(el => el.value = data.email);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTOFILL') {
    chrome.storage.local.get(['name', 'city', 'phone', 'email'], (data) => {
      fillFields(data);
      sendResponse({status: 'done'});
    });
    return true;
  }
});
`;

  const injectContentScript = () => {
    if (window.chrome?.tabs && window.chrome?.scripting) {
      window.chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.id) {
          window.chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: () => {}, 
          }, () => {
            window.chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              func: new Function(contentScriptCode),
            });
          });
        }
      });
    }
  };

  const handlePopupAutofill = () => {
    if (window.chrome?.tabs) {
      window.chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.id) {
          window.chrome.tabs.sendMessage(tabs[0].id, {type: 'AUTOFILL', data: form});
        }
      });
    }
  };

  return (
    <div className="autofill_container">
      <div className="autofill_header">
        <h2 className="autofill_title">
          Autofill forms
        </h2>
        <p className="autofill_subtitle">
          Works with all types of Forms & on all websites
        </p>
      </div>

      <form className="autofill_form_fields" onSubmit={handleSubmit}>
        <div className="autofill_form_group">
          <label className="autofill_label">
            Name
          </label>
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            autoComplete="off"
            className="autofill_input"
            value={form.name}
            onChange={handleChange}
          />
        </div>
        <div className="autofill_form_group">
          <label className="autofill_label">
            City
          </label>
          <input
            type="text"
            name="city"
            placeholder="Enter your city"
            autoComplete="off"
            className="autofill_input"
            value={form.city}
            onChange={handleChange}
          />
        </div>

        <div className="autofill_form_group">
          <label className="autofill_label">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="Enter your phone number"
            autoComplete="off"
            className="autofill_input"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div className="autofill_form_group">
          <label className="autofill_label">
            email
          </label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email address"
            autoComplete="off"
            className="autofill_input"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="autofill_button_row">
          <button className="autofill_save_btn btn" type="submit">
            Save
          </button>
        </div>
        <button className="btn" type="button" onClick={handlePopupAutofill} style={{marginTop: 10}}>
  Autofill this page
</button>

        <button className="btn" type="button">
          Clear fields
        </button>
      </form>

      <div className="autofill_tip_box">
        <p className="autofill_tip_text">
          Didn't autofill? Submit the link of site/form in the <a href="https://github.com/Abhishek-bramhawale/autofill_extension/issues" target="_blank" rel="noopener noreferrer">GitHub repo issues section</a> so that I can improve it.
        </p>
      </div>
    </div>
  )
}

export default App
