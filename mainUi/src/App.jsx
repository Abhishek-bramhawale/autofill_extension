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

  
const handleAutofill=() =>{
  if (window.chrome?.tabs) {
    window.chrome.tabs.query({active: true, currentWindow: true}, (tabs) =>{
      if (tabs[0]?.id) {
        window.chrome.tabs.sendMessage(tabs[0].id, {
          type: 'AUTOFILL',
          data: form
        });
      }
    });
  }
};

  const contentScriptCode=`
function fillFields(data) {
  if (data.name) document.querySelectorAll('input[name="name"]').forEach(el => el.value=data.name);
  if (data.city) document.querySelectorAll('input[name="city"]').forEach(el => el.value=data.city);
  if (data.phone) document.querySelectorAll('input[name="phone"]').forEach(el => el.value=data.phone);
  if (data.email) document.querySelectorAll('input[name="email"]').forEach(el => el.value=data.email);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>{
  if (request.type === 'AUTOFILL') {
    chrome.storage.local.get(['name', 'city', 'phone', 'email'], (data) =>{
      fillFields(data);
      sendResponse({status: 'done'});
    });
    return true;
  }
});
`;

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
