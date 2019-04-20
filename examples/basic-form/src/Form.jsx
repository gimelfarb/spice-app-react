/* eslint-disable no-console */
import React, { useState } from 'react';

export default function Form() {
    const onChange = (e) => console.log('Changed - ' + e.target.name);
    const onSubmit = (e) => {
        console.log('Submit clicked');
        e.preventDefault();
    }
    
    const [isStatusOther, setStatusOther] = useState(false);
    const onStatusChange = (e) => {
        setStatusOther(e.target.value === 'other');
    }

    const [isAgreed, setAgreed] = useState(false);
    const onAgreementChange = (e) => {
        setAgreed(e.target.checked);
    }

    return (
        <form>
            <input name="name" onChange={onChange}/>
            <input name="phone" onChange={onChange}/>

            <select name="status" onChange={onStatusChange}/>
            <div id="field-status-other" hidden={!isStatusOther}>
               <input name="statusText" />
            </div>

            {isStatusOther ? <label htmlFor="statusText" style={{ display: 'block', color: 'blue' }} /> : null}

            <label id="label-agreement" style={{ color: isAgreed ? 'green' : 'red' }} />
            <input name="agreement" onChange={onAgreementChange} />

            <button type="submit" onClick={onSubmit} />
        </form>
    );
}
