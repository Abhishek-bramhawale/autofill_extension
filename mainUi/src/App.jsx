import './App.css'

import { useEffect, useState } from "react";

const FORM_FIELDS =['name', 'phone', 'city', 'email'];
const FIELD_CONFIG= {
  name: { type: 'text', placeholder:'Enter your name'},
  phone: { type:'tel',placeholder: 'Enter your phone number' },
  city: { type:'text',placeholder:'Enter your city'},
  email:{ type: 'email', placeholder:'Enter your email address' }
};

function App(){

const [form, setForm]=useState(Object.fromEntries(FORM_FIELDS.map(field => [field, ''])));
  const [status, setStatus]=useState("");

  useEffect(() =>{
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get(FORM_FIELDS, (result) =>{
        setForm(Object.fromEntries(FORM_FIELDS.map(field => [field, result[field] || ''])));
      });
    }
  }, []);

  const handleChange=(e) =>{
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit=(e) =>{
    e.preventDefault();
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.set(form, () => window.alert("Data saved successfully!"));
    }
    localStorage.setItem('autofillDetails', JSON.stringify(form));
    if (!window.chrome?.storage?.local) window.alert("Data saved successfully!");
  };

  
const handleAutofill = async () =>{
  if (!window.chrome?.tabs) {
    setStatus("Chrome extension API not available");
    return;
  }

  setStatus("Preparing autofill...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("current tab not accessible");
      return;
    }

    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    ) {
      setStatus("Cannot autofill on browser pages");
      return;
    }

    setStatus("🔍 Step 1: Filling direct matches...");
    let directFilledCount = 0;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL", data: form });
      if (response?.success) {
        directFilledCount = response.filledFields || 0;
        if (directFilledCount > 0)
          setStatus(`Step 1: Filled ${directFilledCount} field(s) with direct matching`);
        else
          setStatus("No direct field matches found.");
      }
    } catch {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: directAutofill,
          args: [form],
        });
        if (result?.[0]?.result) {
          directFilledCount = result[0].result.filledFields || 0;
          setStatus(`Step 1: Filled ${directFilledCount} field(s) with direct injection`);
        }
      } catch (error) {
        console.error('Direct injection failed:', error);
        setStatus("Direct autofill failed");
      }
    }

    

  } catch (error) {
    console.error('Autofill error:', error);
    setStatus("Autofill failed. Please refresh the page and try again.");
  }

  setTimeout(() => setStatus(""), 4000);
};


  const injectContentScript=() =>{
    if (window.chrome?.tabs && window.chrome?.scripting) {
      window.chrome.tabs.query({active: true, currentWindow: true}, (tabs) =>{
        if (tabs[0]?.id) {
          window.chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: () =>{}, 
          }, () =>{
            window.chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              func: new Function(contentScriptCode),
            });
          });
        }
      });
    }
  };

    const handleClearData = () =>{
    if (window.confirm("Are you sure you want to clear all saved data?")) {
      setForm(Object.fromEntries(FORM_FIELDS.map(field => [field, ''])));
      if (window.chrome?.storage?.local) {
        window.chrome.storage.local.clear(() =>{
          setStatus("All data cleared!");
          setTimeout(() => setStatus(""), 2000);
        });
      }
    }
  };

  const getStatusStyle = (status) => ({
    padding: '10px 12px',
    borderRadius: 6,
    backgroundColor: status.includes('❌') ? '#f8d7da' : status.includes('⚠️') ? '#fff3cd' : '#d1edff',
    color: status.includes('❌') ? '#721c24' : status.includes('⚠️') ? '#856404' : '#0c5460',
    fontSize: 13,
    textAlign: 'center',
    border: `1px solid ${status.includes('❌') ? '#f5c6cb' : status.includes('⚠️') ? '#faeeba' : '#bee5eb'}`,
    marginTop: 8
  });

  const handlePopupAutofill=() =>{
    if (window.chrome?.tabs) {
      window.chrome.tabs.query({active: true, currentWindow: true}, (tabs) =>{
        if (tabs[0]?.id) {
          window.chrome.tabs.sendMessage(tabs[0].id, {type: 'AUTOFILL', data: form});
        }
      });
    }
  };

 return (
    <div className="autofill_container">
      <div className="autofill_header">
        <h2 className="autofill_title">Autofill forms</h2>
        <p className="autofill_subtitle">Works with all types of Forms & on all websites</p>
      </div>

      <form className="autofill_form_fields" onSubmit={handleSubmit}>
        {FORM_FIELDS.map(field => (
          <div key={field} className="autofill_form_group">
            <label className="autofill_label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input
              type={FIELD_CONFIG[field].type}
              name={field}
              placeholder={FIELD_CONFIG[field].placeholder}
              autoComplete="off"
              className="autofill_input"
              value={form[field]}
              onChange={handleChange}
            />
          </div>
        ))}

        <div className="autofill_button_row">
          <button className="autofill_save_btn btn" type="submit">Save</button>
        </div>
        <button className="btn" type="button" onClick={handleAutofill} style={{marginTop: 10}}>
          Autofill this page
        </button>
        <button className="btn" type="button" onClick={handleClearData}>Clear fields</button>
      </form>

      {status && <div style={getStatusStyle(status)}>{status}</div>}

      <div className="autofill_tip_box">
        <p className="autofill_tip_text">
          Didn't autofill? Submit the link of site/form in the <a href="https://github.com/Abhishek-bramhawale/autofill_extension/issues" target="_blank" rel="noopener noreferrer">GitHub repo issues section</a> so that I can improve it.
        </p>
      </div>
    </div>
  );
}

function directAutofill(formData) {
  if (!window.universalAutofillInstance) injectAutofillScript();
  return window.universalAutofillInstance?.autofill(formData);
}

function injectAutofillScript() {
  if (window.universalAutofillInjected) return;
  window.universalAutofillInjected=true;

  class UniversalAutofill {
    constructor() {
      this.fieldMappings={
        name: ['name', 'fullname', 'full-name', 'full_name', 'firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'user-name', 'username', 'your-name', 'applicant-name', 'student-name', 'person-name', 'contact-name'],
        email: ['email', 'e-mail', 'mail', 'email-address', 'email_address', 'user-email', 'contact-email', 'your-email', 'emailaddress'],
        phone: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'number', 'phone-number', 'phone_number', 'your-phone', 'contact-number'],
        city: ['city', 'town', 'location', 'place', 'residence', 'hometown', 'current-city', 'your-city', 'city-name', 'live-in', 'based-in', 'from-city', 'student-city']
      };
    }

    autofill(data) {
      let totalFilled=0;
      Object.entries(data).forEach(([fieldType, value]) =>{
        if (value?.trim() && this.fillField(fieldType, value.trim())) totalFilled++;
      });
      this.fillGoogleForms(data);
      return { success: true, filledFields: totalFilled };
    }

    fillField(fieldType, value) {
      const keywords=this.fieldMappings[fieldType] || [];
      const selectors=['input[type="text"]', 'input[type="email"]', 'input[type="tel"]', 'input[type="number"]', 'input:not([type])', 'textarea'];
      
      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          if (this.matchesField(element, keywords) && !element.value && this.fillElement(element, value)) {
            return true;
          }
        }
      }
      return false;
    }

    matchesField(element, keywords) {
      const searchText=[element.name, element.id, element.className, element.placeholder, element.getAttribute('aria-label'), element.getAttribute('title'), this.getAssociatedLabelText(element)].filter(Boolean).join(' ').toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword) || this.fuzzyMatch(searchText, keyword));
    }

    fuzzyMatch(text, keyword) {
      const cleanText=text.replace(/[^a-zA-Z0-9]/g, '');
      const cleanKeyword=keyword.replace(/[^a-zA-Z0-9]/g, '');
      return cleanText.includes(cleanKeyword);
    }

    getAssociatedLabelText(element) {
      let labelText='';
      if (element.id) {
        const label=document.querySelector(`label[for="${element.id}"]`);
        if (label) labelText += ' ' + label.textContent;
      }
      const parentLabel=element.closest('label');
      if (parentLabel) labelText += ' ' + parentLabel.textContent;
      return labelText.trim();
    }

    fillElement(element, value) {
      try {
        element.value=value;
        ['input', 'change', 'blur'].forEach(eventType => element.dispatchEvent(new Event(eventType, { bubbles: true })));
        element.style.backgroundColor='#e8f5e8';
        setTimeout(() => element.style.backgroundColor='', 1000);
        return true;
      } catch (error) {
        console.error('Error filling element:', error);
        return false;
      }
    }

    fillGoogleForms(data) {
      const googleInputs=document.querySelectorAll([
        '.quantumWizTextinputPaperinputInput', '.quantumWizTextinputPapertextareaInput',
        '.freebirdFormviewerViewItemsTextShortText input', '.freebirdFormviewerViewItemsTextLongText textarea', '[jsname="YPqjbf"]'
      ].join(', '));

      googleInputs.forEach(input =>{
        if (input.value) return;
        const container=input.closest('[data-params*="question"], .freebirdFormviewerViewItemsItem');
        if (container) {
          const questionText=container.textContent.toLowerCase();
          Object.entries(data).forEach(([fieldType, value]) =>{
            if (value && this.fieldMappings[fieldType]?.some(keyword => questionText.includes(keyword))) {
              this.fillElement(input, value);
            }
          });
        }
      });
    }
  }

  window.universalAutofillInstance=new UniversalAutofill();
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>{
      if (message.type === 'AUTOFILL') {
        sendResponse(window.universalAutofillInstance.autofill(message.data));
        return true;
      }
    });
  }
}

export default App
