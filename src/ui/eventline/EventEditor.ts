import { css, customElement, html, LitElement, property } from "lit-element";
import { Contact } from "../../logic/Contact"
import { Simulation } from "../../logic/Simulation";
@customElement("event-editor")
export class EventEditor extends LitElement {
    static get styles(){
        return css`
        :host{
            position:fixed;
            z-index:100;
            left:25%;
            top:25%;
            height:50%;
            width:50%;
            background-color:grey;
        }
        `
    }
    contact: Contact;
    simulation: Simulation;
    onfinish:()=>void=()=>{};

    constructor(simulation: Simulation, contact: Contact = new Contact(null, null, { date: new Date(), intensity: 0 })) {
        super();
        this.simulation = simulation;
        this.contact = contact;
    }
    render() {
        const persons=new Array(...this.simulation.persons.keys());
        return html`
        <p>Person 1:
            <select id="person1select" @change=${this.person1change}>
                <option value="">None</option>
                ${persons.map((person)=>{
                    return html`
                    <option value=${person.name} ?selected=${this.contact.a&&person==this.contact.a}>${person.name}</option>
                    `})}
            </select>
        </p>
        <p>Person 2:
            <select id="person2select" @change=${this.person2change}>
                <option value="">None</option>
                ${persons.map((person)=>{
                    return html`
                    <option value=${person.name} ?selected=${this.contact.b&&person==this.contact.b}>${person.name}</option>
                    `})}
            </select>
        </p>
        <p>Intensity: <input id="in" type="number" .value=${String(this.contact.intensity)} @change=${()=>this.contact.intensity=Number.parseFloat((<HTMLInputElement>this.shadowRoot.getElementById("in")).value)}></p>
        <p>Date of contact: <input id="date" type="date" .valueAsDate=${this.contact.date} @change=${()=>this.contact.date=new Date((<HTMLInputElement>this.shadowRoot.getElementById("date")).value)}></p>
        <button @click=${this.close}>close</button>
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
    close(event:Event){
        if(!this.contact.a||!this.contact.b){
            alert("please specify the persons having contact!");
            return;
        }
        this.onfinish();
        this.remove();
    }
}