import { css, customElement, html, LitElement, property } from "lit-element";
import { Contact } from "../../logic/Contact"
import { Simulation } from "../../logic/Simulation";
@customElement("event-editor")
export class EventEditor extends LitElement {
    contact: Contact;
    simulation: Simulation;

    constructor(simulation: Simulation, contact: Contact = new Contact(null, null, { date: new Date(), intensity: 0 })) {
        super();
        this.simulation = simulation;
        this.contact = contact;
    }
    render() {
        return html`
        <p>Person 1:
            <select id="person1select" @change=${this.person1change}>
                <option value="">None</option>
                ${new Array(...this.simulation.persons.keys()).map((person)=>{
                    return html`
                    <option value=${person.name}>${person.name}</option>
                    `})}
            </select>
        </p>
        <p>Person 1:
            <select id="person2select" @change=${this.person2change}>
                <option value="">None</option>
                ${new Array(...this.simulation.persons.keys()).map((person)=>{
                    return html`
                    <option value=${person.name}>${person.name}</option>
                    `})}
            </select>
        </p>
        <p>Intensity: <input type="number" .value=${this.contact.intensity}></p>
        `
    }
    person1change(event:Event){
        const select:HTMLSelectElement=<HTMLSelectElement> this.shadowRoot.getElementById("person1select");
        const selected=select.value;
        for(let person of this.simulation.persons){
            if(person.name==selected){
                this.contact.a=person;
            }
        }
    }

    person2change(event:Event){
        const select:HTMLSelectElement=<HTMLSelectElement> this.shadowRoot.getElementById("person2select");
        const selected=select.value;
        for(let person of this.simulation.persons){
            if(person.name==selected){
                this.contact.b=person;
            }
        }
    }
}