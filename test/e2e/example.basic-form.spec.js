import { Selector } from 'testcafe';

fixture `Example: basic-form`
    .page('http://localhost:8080/');

test('Test renders correct structure', async (t) => {
    await t
        .expect(Selector('form div input[name="name"]').exists).ok()
        .expect(Selector('form div input[name="phone"]').exists).ok()
        .expect(Selector('form div div input[name="statusText"]').visible).notOk('Should be hidden via React');
});

test('Test agreement checkbox changes color', async (t) => {
    const labelAgreement = Selector('label[for="agreement"]');
    let labelAgreementStyle = await labelAgreement.style;

    await t.expect(labelAgreementStyle['color']).eql('rgb(255, 0, 0)');
    await t.click(Selector('input[name="agreement"]'));

    labelAgreementStyle = await labelAgreement.style;
    await t.expect(labelAgreementStyle['color']).eql('rgb(0, 128, 0)');
});

test('Changing status displays extra fields', async (t) => {
    const selectStatus = Selector('select[name="status"]');
    const selectStatusOption = selectStatus.find('option');

    const inputOther = Selector('input[name="statusText"]');
    const labelOther = Selector('label[for="statusText"]');

    await t.click(selectStatus).click(selectStatusOption.withText('Married'));
    await t.expect(inputOther.visible).notOk();
    await t.expect(labelOther.visible).notOk();

    await t.click(selectStatus).click(selectStatusOption.withText('Other'));
    await t.expect(inputOther.visible).ok();
    await t.expect(labelOther.visible).ok();

    await t.click(selectStatus).click(selectStatusOption.withText('Single'));
    await t.expect(inputOther.visible).notOk();
    await t.expect(labelOther.visible).notOk();
});