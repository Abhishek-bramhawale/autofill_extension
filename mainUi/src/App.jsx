import './App.css'

import { useEffect, useState } from "react";

const FORM_FIELDS =['name', 'phone', 'city', 'email', 'dob'];
const FIELD_CONFIG= {
  name: { type: 'text', placeholder:'Enter your name'},
  phone: { type:'tel',placeholder: 'Enter your phone number' },
  // city: { type:'text',placeholder:'Enter your city'},
  email:{ type: 'email', placeholder:'Enter your email address' },
  dob: { type: 'date', placeholder:'Select your date of birth' }
};

function App(){

const [form, setForm]=useState(Object.fromEntries(FORM_FIELDS.map(field => [field, ''])));
  const [status, setStatus]=useState("");

  useEffect(() =>{
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get(null, (result) =>{
        const savedForm = {};
        
        FORM_FIELDS.forEach(field => {
          savedForm[field] = result[field] || '';
        });
        
        Object.keys(result).forEach(key => {
          if (!FORM_FIELDS.includes(key) && key !== 'formFields') {
            savedForm[key] = result[key] || '';
          }
        });
        
        setForm(savedForm);
      });
    }
  }, []);

  const handleChange=(e) =>{
    const newValue = e.target.value;
    setForm({ ...form, [e.target.name]: newValue });
    
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.set({ [e.target.name]: newValue });
    }
  };

  const handleSubmit=(e) =>{
    e.preventDefault();
    if (window.chrome?.storage?.local) {
      const dataToSave = {};
      Object.keys(form).forEach(key => {
        dataToSave[key] = form[key];
      });
      window.chrome.storage.local.set(dataToSave, () => window.alert("Data saved successfully!"));
    }
    localStorage.setItem('autofillDetails', JSON.stringify(form));
    if (!window.chrome?.storage?.local) window.alert("Data saved successfully!");
  };

  const addNewField = () => {
    const fieldName = prompt("Enter field name (e.g., address, zipcode, company):");
    if (fieldName && fieldName.trim()) {
      const cleanFieldName = fieldName.trim().toLowerCase();
      setForm(prev => ({ ...prev, [cleanFieldName]: "" }));
      
      if (window.chrome?.storage?.local) {
        window.chrome.storage.local.set({ [cleanFieldName]: "" });
      }
    }
  };

  const removeField = (fieldName) => {
    if (confirm(`Remove field "${fieldName}"?`)) {
      const newForm = { ...form };
      delete newForm[fieldName];
      setForm(newForm);
      
      if (window.chrome?.storage?.local) {
        window.chrome.storage.local.remove(fieldName);
      }
    }
  };

   const handleAutofill = async () => {
    if (!window.chrome?.tabs) {
      setStatus("Chrome extension API not available");
      return;
    }

    setStatus("Preparing autofill...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatus("Could not access current tab");
        return;
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        setStatus("Cannot autofill on browser pages");
        return;
      }

      setStatus("Step 1: Filling direct matches...");
      let directFilledCount = 0;
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL", data: form });
        if (response?.success) {
          directFilledCount = response.filledFields || 0;
          if (directFilledCount > 0) setStatus(`Step 1: Filled ${directFilledCount} field(s) with direct matching`);
        }
      } catch {
        try {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: directAutofill,
            args: [form]
          });
          if (result?.[0]?.result) {
            directFilledCount = result[0].result.filledFields || 0;
            setStatus(`Step 1: Filled ${directFilledCount} field(s) with direct injection`);
          }
        } catch (error) {
          console.error('Direct injection failed:', error);
        }
      }

      setStatus("Step 2: Using AI as fallback for remaining fields...");
      await tryAIAutofillForRemaining(tab.id, directFilledCount);
    } catch (error) {
      console.error('Autofill error:', error);
      setStatus("Autofill failed. Please refresh the page and try again.");
    }
    setTimeout(() => setStatus(""), 4000);
  };

    const tryAIAutofillForRemaining = async (tabId, directFilledCount) => {
    try {
      setStatus("Trying direct matching for remaining fields...");
      const directResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: (formData) => {
          let filled = 0;
          const allInputs = document.querySelectorAll('input, textarea, select');
          
          console.log('=== GOOGLE FORM FIELD ANALYSIS ===');
          console.log('Total inputs found:', allInputs.length);
          
          function getGoogleFormFields() {
            const formFields = [];
            
            const inputs = document.querySelectorAll("input, textarea");
            
            inputs.forEach((input) => {
              const container = input.closest("div[role='listitem']");
              if (!container) return;
              
              const heading = container.querySelector("div[role='heading']");
              const label = heading?.textContent?.trim();
              
              if (label) {
                formFields.push({
                  label,
                  type: input.type || input.tagName.toLowerCase(),
                  element: input
                });
              }
            });
            
            return formFields;
          }
          
          const googleFormFields = getGoogleFormFields();
          console.log("Detected Google Form Fields:", googleFormFields);
          
          const fieldMappings = {
            name: ['name', 'fullname', 'full-name', 'full_name', 'firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'user-name', 'username', 'your-name', 'applicant-name', 'student-name', 'person-name', 'contact-name', 'नाव'],
            email: ['email', 'e-mail', 'mail', 'email-address', 'email_address', 'user-email', 'contact-email', 'your-email', 'emailaddress'],
            phone: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'number', 'phone-number', 'phone_number', 'your-phone', 'contact-number', 'isme null hai', 'mobile number'],
            city: ['city', 'town', 'location', 'place', 'residence', 'hometown', 'current-city', 'your-city', 'city-name', 'live-in', 'based-in', 'from-city', 'student-city', 'kaha rehte ho', 'address', 'pata', 'ghar', 'sheher', 'pincode'],
            dob: ['dob', 'date-of-birth', 'date_of_birth', 'birthdate', 'birth-date', 'birth_date', 'dateofbirth', 'birthday', 'birth-day', 'birth_day', 'age', 'date', 'born', 'birth', 'जन्म तिथि', 'जन्मदिन']
          };
          
          googleFormFields.forEach(({ label, element }) => {
            console.log(`Processing Google Form field: "${label}"`);
            
            Object.entries(formData).forEach(([fieldType, value]) => {
              console.log('Checking field type:', fieldType, 'with value:', value);
              const keywords = fieldMappings[fieldType] || [];
              console.log('Keywords for', fieldType, ':', keywords);
              
              const isMatch = keywords.some(keyword => 
                label.toLowerCase().includes(keyword) || 
                keyword.includes(label.toLowerCase()) ||
                label.toLowerCase().includes(fieldType)
              );
              
              console.log('Is match:', isMatch);
              
              if (value && isMatch) {
                console.log('MATCH FOUND! Filling Google Form field:', fieldType, 'with value:', value, 'for label:', label);
                element.value = value;
                ['input', 'change', 'blur'].forEach(eventType => {
                  element.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                filled++;
              } else {
                console.log(' No match for field type:', fieldType);
              }
            });
          });
          
          allInputs.forEach((input, index) => {
            console.log(`\n--- Field ${index + 1} ---`);
            console.log('Input element:', input);
            console.log('Type:', input.type);
            console.log('Name:', input.name);
            console.log('ID:', input.id);
            console.log('Placeholder:', input.placeholder);
            console.log('Value:', input.value);
            console.log('Aria-label:', input.getAttribute('aria-label'));
            console.log('Aria-labelledby:', input.getAttribute('aria-labelledby'));
            console.log('Class list:', input.className);
            
            if (input.value) {
              console.log('SKIPPING - Already has value');
              return; 
            }
            
            if (input.type === 'hidden' && !input.name?.startsWith('entry.')) {
              console.log('SKIPPING - Hidden field (not Google Forms entry)');
              return;
            }
            
            let questionText = '';
            let fieldName = input.name || input.id || '';
            
            if (fieldName.startsWith('entry.')) {
              console.log('Processing Google Forms entry field:', fieldName);
              
              if (fieldMapping[fieldName]) {
                questionText = fieldMapping[fieldName];
                console.log('Using field mapping:', fieldName, '->', questionText);
              } else {
                let container = input.closest('[data-params*="question"], .Qr7Oae, .freebirdFormviewerViewItemsItem');
                if (container) {
                  questionText = container.textContent.toLowerCase();
                  console.log('Found container text:', container.textContent);
                }
                
                if (!questionText && input.getAttribute('aria-labelledby')) {
                  const labelId = input.getAttribute('aria-labelledby');
                  const labelElement = document.getElementById(labelId);
                  if (labelElement) {
                    questionText = labelElement.textContent.toLowerCase();
                    console.log('Found aria-labelledby text:', labelElement.textContent);
                  }
                }
                
                if (!questionText && input.getAttribute('aria-label')) {
                  questionText = input.getAttribute('aria-label').toLowerCase();
                  console.log('Found aria-label text:', input.getAttribute('aria-label'));
                }
              }
            } else {
              console.log('Processing regular field:', fieldName);
              const isGoogleForm = document.querySelector('.freebirdFormviewerViewFormContentWrapper, .quantumWizTextinputPaperinputInput, [jsname="YPqjbf"]');
              console.log('Is Google Form detected:', !!isGoogleForm);
              
              if (isGoogleForm) {
                console.log('Using Google Forms extraction method');
                let container = input.closest('[data-params*="question"], .Qr7Oae, .freebirdFormviewerViewItemsItem, .M4DNQ');
                if (container) {
                  questionText = container.textContent.toLowerCase();
                  console.log('Found Google Forms container text:', container.textContent);
                }
                
                if (!questionText && input.getAttribute('aria-labelledby')) {
                  const labelId = input.getAttribute('aria-labelledby');
                  const labelElement = document.getElementById(labelId);
                  if (labelElement) {
                    questionText = labelElement.textContent.toLowerCase();
                    console.log('Found Google Forms aria-labelledby text:', labelElement.textContent);
                  }
                }
                
                if (!questionText && input.getAttribute('aria-label')) {
                  questionText = input.getAttribute('aria-label').toLowerCase();
                  console.log('Found Google Forms aria-label text:', input.getAttribute('aria-label'));
                }
              }
              console.log('Using regular field extraction method');
              let labelText = '';
              if (input.id) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) {
                  labelText = label.textContent.toLowerCase();
                  console.log('Found label text:', label.textContent);
                }
              }
              if (!labelText) {
                const parentLabel = input.closest('label');
                if (parentLabel) {
                  labelText = parentLabel.textContent.toLowerCase();
                  console.log('Found parent label text:', parentLabel.textContent);
                }
              }
              
              let placeholderText = '';
              if (input.placeholder && !/^\d+$/.test(input.placeholder) && input.placeholder.length > 3) {
                placeholderText = input.placeholder.toLowerCase();
                console.log('Using meaningful placeholder:', input.placeholder);
              } else {
                console.log('Skipping placeholder (numeric or too short):', input.placeholder);
              }
              
              questionText = [input.name, input.id, labelText, placeholderText, input.getAttribute('aria-label')]
                .filter(Boolean).join(' ').toLowerCase();
              
              console.log('Final question text:', questionText);
            }
            
            const fieldMappings = {
              name: ['name', 'fullname', 'full-name', 'full_name', 'firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'user-name', 'username', 'your-name', 'applicant-name', 'student-name', 'person-name', 'contact-name', 'नाव'],
              email: ['email', 'e-mail', 'mail', 'email-address', 'email_address', 'user-email', 'contact-email', 'your-email', 'emailaddress'],
              phone: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'number', 'phone-number', 'phone_number', 'your-phone', 'contact-number', 'isme null hai'],
              city: ['city', 'town', 'location', 'place', 'residence', 'hometown', 'current-city', 'your-city', 'city-name', 'live-in', 'based-in', 'from-city', 'student-city', 'kaha rehte ho', 'address', 'pata', 'ghar', 'sheher', 'pincode'],
              dob: ['dob', 'date-of-birth', 'date_of_birth', 'birthdate', 'birth-date', 'birth_date', 'dateofbirth', 'birthday', 'birth-day', 'birth_day', 'age', 'date', 'born', 'birth', 'जन्म तिथि', 'जन्मदिन']
            };
            
            console.log('Attempting to match with form data...');
            Object.entries(formData).forEach(([fieldType, value]) => {
              console.log('Checking field type:', fieldType, 'with value:', value);
              const keywords = fieldMappings[fieldType] || [];
              console.log('Keywords for', fieldType, ':', keywords);
              
              const isMatch = keywords.some(keyword => 
                questionText.includes(keyword) || 
                keyword.includes(questionText) ||
                questionText.includes(fieldType)
              );
              
              console.log('Is match:', isMatch);
              
              if (value && isMatch) {
                console.log('MATCH FOUND! Filling field:', fieldType, 'with value:', value, 'for question text:', questionText);
                input.value = value;
                ['input', 'change', 'blur'].forEach(eventType => {
                  input.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                filled++;
              } else {
                console.log(' No match for field type:', fieldType);
              }
            });
          });
          
          console.log('Total fields filled:', filled);
          return filled;
        },
        args: [form]
      });
      
      const directFilledCount2 = directResult[0]?.result || 0;
      const totalDirectFilled = directFilledCount + directFilledCount2;
      
      if (directFilledCount2 > 0) {
        setStatus(`Direct matching completed! Total filled: ${totalDirectFilled} fields`);
        return;
      }
      
      setStatus("Direct matching failed, trying AI as fallback...");
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const inputs = document.querySelectorAll('input, select, textarea');
          return Array.from(inputs).map(input => {
            let label = '';
            if (input.id) {
              const labelEl = document.querySelector(`label[for="${input.id}"]`);
              if (labelEl) label = labelEl.innerText;
            }
            if (!label) {
              const parentLabel = input.closest('label');
              if (parentLabel) label = parentLabel.textContent;
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
      });
      
      if (!result?.[0]?.result?.length) {
        setStatus("No form fields found on this page");
        return;
      }
      
      setStatus(`Analyzing ${result[0].result.length} form fields with AI...`);
      const mapping = await getAIFieldMapping(result[0].result);
      
      let aiData = {};
      if (mapping && Object.keys(mapping).length > 0) {
        setStatus("AI mapping successful, filling remaining fields...");
        aiData = Object.fromEntries(
          Object.entries(mapping)
            .filter(([fieldName, standardKey]) => standardKey && standardKey !== 'null' && standardKey !== null)
            .map(([fieldName, standardKey]) => [fieldName, form[standardKey] || ''])
        );
        
        console.log('AI mapping result:', aiData);
      } else {
        setStatus("AI mapping failed, no more fields to fill");
      }

      if (Object.keys(aiData).length > 0) {
        try {
          const fillResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: (aiData) => {
              let filled = 0;
              Object.entries(aiData).forEach(([fieldName, value]) => {
                const selectors = [
                  `input[name="${fieldName}"]`, `input[id="${fieldName}"]`,
                  `textarea[name="${fieldName}"]`, `textarea[id="${fieldName}"]`
                ];
                let inputs = document.querySelectorAll(selectors.join(', '));
                
                if (inputs.length === 0) {
                  const allInputs = document.querySelectorAll('input, textarea, select');
                  inputs = Array.from(allInputs).filter(input => {
                    if (input.placeholder && input.placeholder.toLowerCase().includes(fieldName.toLowerCase())) {
                      return true;
                    }
                    
                    let labelText = '';
                    if (input.id) {
                      const label = document.querySelector(`label[for="${input.id}"]`);
                      if (label) labelText = label.textContent.toLowerCase();
                    }
                    if (!labelText) {
                      const parentLabel = input.closest('label');
                      if (parentLabel) labelText = parentLabel.textContent.toLowerCase();
                    }
                    
                    return labelText.includes(fieldName.toLowerCase()) || 
                           fieldName.toLowerCase().includes(labelText) ||
                           (input.placeholder && input.placeholder.toLowerCase().includes(fieldName.toLowerCase()));
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
            },
            args: [aiData]
          });
          
          const aiFilledCount = fillResult[0]?.result || 0;
          const totalFilled = directFilledCount + aiFilledCount;
          
          if (aiFilledCount > 0) {
            setStatus(`Complete! Direct: ${totalDirectFilled}, AI: ${aiFilledCount} = ${totalDirectFilled + aiFilledCount} total fields filled`);
          } else {
            setStatus(`Complete! Direct matching filled ${totalDirectFilled} field(s), AI found no additional matches`);
          }
        } catch (error) {
          console.error('AI field filling failed:', error);
          setStatus(`Complete! Direct matching filled ${totalDirectFilled} field(s), AI filling failed`);
        }
      } else {
        setStatus(`Complete! Direct matching filled ${totalDirectFilled} field(s), AI found no additional mappings`);
      }
    } catch (error) {
      console.error('AI autofill error:', error);
      setStatus(`Complete! Direct matching filled ${totalDirectFilled} field(s), AI analysis failed`);
    }
  };

  const getAIFieldMapping = async (fields) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('http://localhost:3001/api/map-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return JSON.parse(await res.text());
    } catch (error) {
      if (error.name === 'AbortError') return null;
      console.log('AI request failed:', error);
      return null;
    }
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
      setForm(Object.fromEntries(Object.keys(form).map(field => [field, ''])));
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
        {Object.keys(form).map(field => (
          <div key={field} className="autofill_form_group">
            <label className="autofill_label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input
              type={FIELD_CONFIG[field]?.type || 'text'}
              name={field}
              placeholder={FIELD_CONFIG[field]?.placeholder || `Enter your ${field}`}
              autoComplete="off"
              className="autofill_input"
              value={form[field]}
              onChange={handleChange}
            />
            {!FORM_FIELDS.includes(field) && (
              <button 
                type="button" 
                onClick={() => removeField(field)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  minWidth: '60px'
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}

        <div className="autofill_form_group">
          <button 
            type="button" 
            onClick={addNewField}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Add New Field
          </button>
        </div>

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
        city: ['city', 'town', 'location', 'place', 'residence', 'hometown', 'current-city', 'your-city', 'city-name', 'live-in', 'based-in', 'from-city', 'student-city', 'kaha rehte ho', 'address', 'pata', 'ghar', 'sheher'],
        dob: ['dob', 'date-of-birth', 'date_of_birth', 'birthdate', 'birth-date', 'birth_date', 'dateofbirth', 'birthday', 'birth-day', 'birth_day', 'age', 'date', 'born', 'birth', 'जन्म तिथि', 'जन्मदिन']
      };
    }

    autofill(data) {
      let totalFilled=0;
      Object.entries(data).forEach(([fieldType, value]) =>{
        if (value?.trim() && this.fillField(fieldType, value.trim())) totalFilled++;
      });
      
      const selectFilled = this.fillSelectOptions(data);
      totalFilled += selectFilled;
      
      this.fillGoogleForms(data);
      return { success: true, filledFields: totalFilled };
    }

    fillField(fieldType, value) {
      const keywords=this.fieldMappings[fieldType] || [];
      
      if (fieldType === 'dob') {
        const dateSelectors = ['input[type="date"]', 'input[type="datetime-local"]', 'input[type="text"][placeholder*="date"]', 'input[type="text"][placeholder*="birth"]'];
        for (const selector of dateSelectors) {
          for (const element of document.querySelectorAll(selector)) {
            if (this.matchesField(element, keywords) && !element.value && this.fillDateElement(element, value)) {
              return true;
            }
          }
        }
      }
      
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

    fillDateElement(element, value) {
      try {
        if (element.type === 'date' || element.type === 'datetime-local') {
          element.value = value;
        } else {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            element.value = date.toLocaleDateString();
          } else {
            element.value = value;
          }
        }
        ['input', 'change', 'blur'].forEach(eventType => element.dispatchEvent(new Event(eventType, { bubbles: true })));
        element.style.backgroundColor='#e8f5e8';
        setTimeout(() => element.style.backgroundColor='', 1000);
        return true;
      } catch (error) {
        console.error('Error filling date element:', error);
        return false;
      }
    }

    fillSelectOptions(data) {
      let filled = 0;
      
      this.fieldMappings.gender = ['gender', 'male', 'female', 'other', 'prefer not to say'];
      
      Object.entries(data).forEach(([fieldType, value]) => {
        if (!value?.trim()) return;
        
        const keywords = this.fieldMappings[fieldType] || [];
        const selects = document.querySelectorAll('select');
        
        selects.forEach(select => {
          if (this.matchesField(select, keywords)) {
            const options = Array.from(select.options);
            const matchingOption = options.find(option => {
              const optionText = option.text.toLowerCase();
              const optionValue = option.value.toLowerCase();
              const fieldValue = value.toLowerCase();
              
              // Case-insensitive matching for both text and value
              return optionText === fieldValue || 
                     optionValue === fieldValue ||
                     optionText.includes(fieldValue) || 
                     fieldValue.includes(optionText) ||
                     optionValue.includes(fieldValue) ||
                     fieldValue.includes(optionValue);
            });
            
            if (matchingOption) {
              select.value = matchingOption.value;
              ['change', 'input'].forEach(eventType => {
                select.dispatchEvent(new Event(eventType, { bubbles: true }));
              });
              select.style.backgroundColor = '#e8f5e8';
              setTimeout(() => select.style.backgroundColor = '', 1000);
              filled++;
              console.log('Filled select:', select.name || select.id, 'with value:', matchingOption.value);
            }
          }
        });
      });
      
      if (filled === 0) {
        const emptySelects = document.querySelectorAll('select');
        emptySelects.forEach(select => {
          if (select.value === '' || select.value === '0' || select.selectedIndex === 0) {
            const options = Array.from(select.options);
            if (options.length > 1) { // Skip if only has default option
              Object.entries(data).forEach(([fieldType, value]) => {
                if (!value?.trim()) return;
                
                const matchingOption = options.find(option => {
                  const optionText = option.text.toLowerCase();
                  const optionValue = option.value.toLowerCase();
                  const fieldValue = value.toLowerCase();
                  
                  // Case-insensitive matching for both text and value
                  return optionText === fieldValue || 
                         optionValue === fieldValue ||
                         optionText.includes(fieldValue) || 
                         fieldValue.includes(optionText) ||
                         optionValue.includes(fieldValue) ||
                         fieldValue.includes(optionValue);
                });
                
                if (matchingOption) {
                  select.value = matchingOption.value;
                  ['change', 'input'].forEach(eventType => {
                    select.dispatchEvent(new Event(eventType, { bubbles: true }));
                  });
                  select.style.backgroundColor = '#e8f5e8';
                  setTimeout(() => select.style.backgroundColor = '', 1000);
                  filled++;
                  console.log('Filled empty select:', select.name || select.id, 'with value:', matchingOption.value);
                  return; 
                }
              });
            }
          }
        });
      }
      
      return filled;
    }

    fillGoogleForms(data) {
      const allInputs = document.querySelectorAll('input, textarea, select');
      console.log('Total inputs found:', allInputs.length);
      
      allInputs.forEach(input => {
        if (input.value) return;
        
        if (input.type === 'hidden' && !input.name?.startsWith('entry.')) return;
        
        let questionText = '';
        let fieldName = input.name || input.id || '';
        
        if (fieldName.startsWith('entry.')) {
          let container = input.closest('[data-params*="question"], .Qr7Oae, .freebirdFormviewerViewItemsItem');
          if (container) {
            questionText = container.textContent.toLowerCase();
          }
          
          if (!questionText && input.getAttribute('aria-labelledby')) {
            const labelId = input.getAttribute('aria-labelledby');
            const labelElement = document.getElementById(labelId);
            if (labelElement) {
              questionText = labelElement.textContent.toLowerCase();
            }
          }
          
          if (!questionText && input.getAttribute('aria-label')) {
            questionText = input.getAttribute('aria-label').toLowerCase();
          }
          
          console.log('Google Form field:', fieldName, 'question:', questionText);
        } else {
          questionText = [input.name, input.id, input.placeholder, input.getAttribute('aria-label')]
            .filter(Boolean).join(' ').toLowerCase();
        }
        
        Object.entries(data).forEach(([fieldType, value]) => {
          if (value && this.fieldMappings[fieldType]?.some(keyword => 
            questionText.includes(keyword) || 
            keyword.includes(questionText) ||
            this.fuzzyMatch(questionText, keyword)
          )) {
            console.log('Filling field:', fieldType, 'with value:', value, 'for question:', questionText);
            
            if (fieldType === 'dob') {
              this.fillDateElement(input, value);
            } else {
              this.fillElement(input, value);
            }
          }
        });
      });
      
      this.fillGoogleFormsSelectOptions(data);
    }

    fillGoogleFormsSelectOptions(data) {
      let filled = 0;
      
      this.fieldMappings.gender = ['gender', 'male', 'female', 'other', 'prefer not to say'];
      
      const selects = document.querySelectorAll('select');
      
      selects.forEach(select => {
        let questionText = '';
        const container = select.closest('[data-params*="question"], .Qr7Oae, .freebirdFormviewerViewItemsItem');
        
        if (container) {
          questionText = container.textContent.toLowerCase();
        }
        
        if (!questionText && select.getAttribute('aria-labelledby')) {
          const labelId = select.getAttribute('aria-labelledby');
          const labelElement = document.getElementById(labelId);
          if (labelElement) {
            questionText = labelElement.textContent.toLowerCase();
          }
        }
        
        if (!questionText && select.getAttribute('aria-label')) {
          questionText = select.getAttribute('aria-label').toLowerCase();
        }
        
        Object.entries(data).forEach(([fieldType, value]) => {
          if (value && this.fieldMappings[fieldType]?.some(keyword => 
            questionText.includes(keyword) || 
            keyword.includes(questionText) ||
            this.fuzzyMatch(questionText, keyword)
          )) {
            const options = Array.from(select.options);
            const matchingOption = options.find(option => {
              const optionText = option.text.toLowerCase();
              const optionValue = option.value.toLowerCase();
              const fieldValue = value.toLowerCase();
              
              // Case-insensitive matching for both text and value
              return optionText === fieldValue || 
                     optionValue === fieldValue ||
                     optionText.includes(fieldValue) || 
                     fieldValue.includes(optionText) ||
                     optionValue.includes(fieldValue) ||
                     fieldValue.includes(optionValue);
            });
            
            if (matchingOption) {
              select.value = matchingOption.value;
              ['change', 'input'].forEach(eventType => {
                select.dispatchEvent(new Event(eventType, { bubbles: true }));
              });
              select.style.backgroundColor = '#e8f5e8';
              setTimeout(() => select.style.backgroundColor = '', 1000);
              filled++;
              console.log('Filled Google Form select:', select.name || select.id, 'with value:', matchingOption.value);
            }
          }
        });
      });
      
      if (filled === 0) {
        const emptySelects = document.querySelectorAll('select');
        emptySelects.forEach(select => {
          if (select.value === '' || select.value === '0' || select.selectedIndex === 0) {
            const options = Array.from(select.options);
            if (options.length > 1) { // Skip if only has default option
              Object.entries(data).forEach(([fieldType, value]) => {
                if (!value?.trim()) return;
                
                const matchingOption = options.find(option => {
                  const optionText = option.text.toLowerCase();
                  const optionValue = option.value.toLowerCase();
                  const fieldValue = value.toLowerCase();
                  
                  // Case-insensitive matching for both text and value
                  return optionText === fieldValue || 
                         optionValue === fieldValue ||
                         optionText.includes(fieldValue) || 
                         fieldValue.includes(optionText) ||
                         optionValue.includes(fieldValue) ||
                         fieldValue.includes(optionValue);
                });
                
                if (matchingOption) {
                  select.value = matchingOption.value;
                  ['change', 'input'].forEach(eventType => {
                    select.dispatchEvent(new Event(eventType, { bubbles: true }));
                  });
                  select.style.backgroundColor = '#e8f5e8';
                  setTimeout(() => select.style.backgroundColor = '', 1000);
                  filled++;
                  console.log('Filled empty Google Form select:', select.name || select.id, 'with value:', matchingOption.value);
                  return; 
                }
              });
            }
          }
        });
      }
      
      return filled;
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
