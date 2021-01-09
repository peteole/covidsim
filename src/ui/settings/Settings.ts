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
                padding:5px;
                border:outset;
            }
            .personpreview{
                border:1px;
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
            ${this.simulation.personArray.map((person) => html`<p class="personpreview" @click=${()=>
            this.editPerson(person)}>${person.name} (${person.untrackedFrequency} untracked contacts with intensity 
                ${person.untrackedIntensity} per day)</p>`)}
            <button @click=${this.addPerson}>add Person</button>
            <p>Note that all persons must have different names!</p>
            <hr>
            <p>Maximum error to allow <input id="maxerror" type="number" .value=${String(this.simui.accuracy)} @change=${() =>
                this.simui.accuracy = Number.parseFloat((<HTMLInputElement>
                            this.shadowRoot.getElementById("maxerror")).value)}></p>
            <p>Number of datapoints to show per day: <input id="showfreq" type="number" .value=${String(1/this.simui.resolution)} @change=${() =>
                                this.simui.resolution = 1/Number.parseFloat((<HTMLInputElement>
                                            this.shadowRoot.getElementById("showfreq")).value)}></p>
            
            <p>First date to simulate: <input id="date" type="date" .valueAsDate=${this.simulation.initialDate} @change=${()=>this.simulation.initialDate=new Date((<HTMLInputElement>this.shadowRoot.getElementById("date")).value)}></p>
            <p>Last date to simulate: <input id="date2" type="date" .valueAsDate=${this.simulation.lastDate} @change=${()=>this.simulation.lastDate=new Date((<HTMLInputElement>this.shadowRoot.getElementById("date2")).value)}></p>
            <button @click=${()=>{localStorage.removeItem("simulation");window.onbeforeunload=null;location.reload()}}>delete data</button>
            <button @click=${()=> { this.simui.eventline.deepUpdate(); this.simui.graph.simulate(null); this.remove() }}>close</button>
        `
    }
    editPerson(person: Person) {
        const editor = new PersonEditor(person, this.simui);
        editor.editFinished.then(() => this.requestUpdate());
        document.body.appendChild(editor);
    }
    addPerson() {
        const newPerson = new Person("");
        const editor = new PersonEditor(newPerson, this.simui);
        editor.editFinished.then(() => {
            this.simulation.addPerson(newPerson);
            this.requestUpdate();
        });
        document.body.appendChild(editor);
    }
}