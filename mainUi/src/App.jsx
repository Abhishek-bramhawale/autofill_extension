import './App.css'

function App() {
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

      <div className="autofill_form_fields">
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
          />
        </div>

        <div className="autofill_form_group">
          <label className="autofill_label">
            Phone
          </label>
          <input
            type="number"
            name="phone"
            placeholder="Enter your phone number"
            autoComplete="off"
            className="autofill_input"
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
          />
        </div>

        <div className="autofill_button_row">
          <button className="autofill_save_btn btn">
            Save
          </button>
          <button className="autofill_autofill_btn btn">
            Autofill info 
          </button>
        </div>

        <button className="btn">
        Clear fields
        </button>
      </div>

      <div className="autofill_tip_box">
        <p className="autofill_tip_text">
          Didn't autofill? Submit the link of site/form in the <a href="https://github.com/Abhishek-bramhawale/autofill_extension/issues" target="_blank" rel="noopener noreferrer">GitHub repo issues section</a> so that I can improve it.
        </p>
      </div>
    </div>
  )
}

export default App
