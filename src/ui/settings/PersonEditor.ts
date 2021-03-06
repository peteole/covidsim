import { Person } from "../../logic/Person";
import { LitElement, html, property, customElement, css } from "lit-element";
import { SimUI } from "../SimUI";
@customElement("person-editor")
export class PersonEditor extends LitElement {
    static get styles() {
        return css`
            :host{
                z-index:150;
                background-color:grey;
                width:80%;
                left:10%;
                top:10%;
                position:fixed;
                border:outset;
                padding:5px;
            }
            input{
                width:80%;
            }
        `
    }
    person: Person;
    editFinished: Promise<void>;
    simui: SimUI;
    res: () => void;
    constructor(toEdit = new Person(""), simui: SimUI) {
        super();
        this.person = toEdit;
        this.simui = simui;
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
        <p>Name: <input id="nameinput" .value=${this.person.name} @change=${()=> this.person.name = (<HTMLInputElement>
                this.shadowRoot.getElementById("nameinput")).value} @keyup=${(ev: KeyboardEvent) => {
                if (ev.key === "Enter")
                this.close()
                }}></p>
        
        <p>Estimated number of untracked contacts per day: <input id="untrin" type="number"
                .value=${String(this.person.untrackedFrequency)} @change=${() => this.person.untrackedFrequency =
                Number.parseFloat((<HTMLInputElement>
                this.shadowRoot.getElementById("untrin")).value)}></p>
        <number-input initial-value=${this.person.untrackedIntensity} @value-change=${(ev:any)=>this.person.untrackedIntensity=ev.detail.value}>Average intensity of untracked contacts</number-input>
        <button @click=${this.delete}>delete person</button>
        <button @click=${this.close}>close</button>
        `;
    }
    close() {
        this.res(); this.remove()
    }
    delete(ev: Event) {
        for (let contact of this.simui.simulation.contacts) {
            if (contact.a == this.person || contact.b == this.person) {
                alert("Person is involved in contact at " + contact.date.toLocaleDateString() + ", remove it first.");
                return;
            }
        }
        for (let test of this.simui.simulation.observations) {
            if (test.person == this.person) {
                alert("Person is involved in a test, remove it first.");
                return;
            }
        }
        this.simui.simulation.persons.delete(this.person);
        this.res();
        this.remove();
    }
}