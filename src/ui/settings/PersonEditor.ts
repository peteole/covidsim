import { Person } from "../../logic/Person";
import { LitElement, html, property, customElement, css } from "lit-element";
@customElement("person-editor")
export class PersonEditor extends LitElement {
    static get styles() {
        return css`
            :host{
                z-index:150;
                background-color:grey;
                width:40%;
                left:30%;
                top:30%;
                position:fixed;
            }
        `
    }
    person: Person;
    editFinished: Promise<void>;
    res: () => void;
    constructor(toEdit = new Person("")) {
        super();
        this.person = toEdit;
        this.editFinished = new Promise((res, rej) => {
            this.res = res;
        })
    }
    updated() {
        this.shadowRoot.getElementById("nameinput").focus();
    }
    render() {
        return html`
        <h2>Edit person</h2>
        <p>Name: <input id="nameinput" .value=${this.person.name} @change=${() => this.person.name = (<HTMLInputElement>
                this.shadowRoot.getElementById("nameinput")).value} @keyup=${(ev: KeyboardEvent) => {
                    if (ev.key === "Enter")
                        this.close()
                }}></p>
        <button @click=${this.close}>close</button>
        `;
    }
    close() {
        this.res(); this.remove()
    }
}