import { css, customElement, html, LitElement, property } from "lit-element";
@customElement("number-input")
export class NumberInput extends LitElement {
    static get styles() {
        return css`
        :host{
            margin-left:10%;
            width:80%;
            display:flex;
            flex-direction:row;
        }
        input{
            flex-grow:10;
        }
        label{
            text-align:center;
            flex-grow:1;
        }
        `
    }
    @property({ type: Number })
    min: number = 0;
    @property({ type: Number })
    max: number = 1;
    @property({ type: Number })
    step: number = 0.01;

    @property({ type: Number, attribute: "initial-value" })
    initialValue: number = 0;
    @property({ type: Boolean, attribute: "show-value" })
    showValue = true;

    @property({ type: Number })
    get value() {
        const inputEl: HTMLInputElement = <HTMLInputElement>this.shadowRoot.getElementById("input");
        if (inputEl)
            return Number.parseFloat(inputEl.value);
        return this.initialValue;
    }
    render() {
        return html`
        <input @change=${this.changeHandler} id="input" type="range" min=${this.min} max=${this.max} step=${this.step}
            value=${String(this.initialValue)} name="input">
        <label for="input">
            <slot></slot>${this.showValue ? html`: ${this.value}` : html``}
        </label>
        `;
    }

    changeHandler(ev: Event) {
        const event = new CustomEvent("value-change", {
            detail: {
                value: this.value
            }
        });
        this.dispatchEvent(event);
        this.requestUpdate();
    }
}