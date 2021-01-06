import { Person } from "../../logic/Person";
import { LitElement, html, property, customElement, css } from "lit-element";
import { Simulation } from "../../logic/Simulation";
import { PersonEditor } from "./PersonEditor";
import { SimUI } from "../SimUI";
@customElement("sim-settings")
export class Settings extends LitElement {
    static get styles() {
        return css`
            :host{
                z-index:100;
                background-color:grey;
                position:fixed;
                width:80%;
                height:80%;
                left:10%;
                top:10%;
            }
        `
    }
    simulation: Simulation;
    simui: SimUI;
    constructor(simui: SimUI) {
        super();
        this.simulation = simui.simulation;
        this.simui = simui;
    }
    render() {

        return html`
            <h2>Settings</h2>
            <hr>
            <h3>Persons</h3>
            ${this.simulation.personArray.map((person) => html`<p @click=${() => this.editPerson(person)}>${person.name}</p>`)}
            <button @click=${this.addPerson}>add Person</button>
            <p>Note that all persons must have different names!</p>
            <hr>
            <p>Number of simulations to run: <input id="runsin" type="number" .value=${String(this.simui.simRuns)} @change=${()=>
                this.simui.simRuns = Number.parseFloat((<HTMLInputElement>
            this.shadowRoot.getElementById("runsin")).value)}></p>
            <button @click=${() => { this.simui.eventline.deepUpdate(); this.remove() }}>close</button>
        `
    }
    editPerson(person: Person) {
        const editor = new PersonEditor(person);
        editor.editFinished.then(() => this.requestUpdate());
        document.body.appendChild(editor);
    }
    addPerson() {
        const newPerson = new Person("");
        const editor = new PersonEditor(newPerson);
        editor.editFinished.then(() => {
            this.simulation.addPerson(newPerson);
            this.requestUpdate();
        });
        document.body.appendChild(editor);
    }
}