import { css, customElement, html, LitElement, property } from "lit-element";
import { Contact } from "../../logic/Contact"
import { Simulation } from "../../logic/Simulation";
import { Test } from "../../logic/Test";
import { SimUI } from "../SimUI";
import { Eventline } from "./Eventline";
@customElement("test-editor")
export class TestEditor extends LitElement {
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
    test: Test;
    simulation: Simulation;
    eventline:Eventline;
    onfinish:()=>void=()=>{};

    constructor(eventline: Eventline, test: Test = new Test(null, new Date(),false,0.9,0.9)) {
        super();
        this.simulation = eventline.simulation;
        this.eventline=eventline;
        this.test = test;
    }
    render() {
        const persons=new Array(...this.simulation.persons.keys());
        if(!this.test.person)
            this.test.person=persons[0];
        return html`
        <p>Person:
            <select id="person1select" @change=${this.person1change}>
                <option value="">None</option>
                ${persons.map((person)=>{
                    return html`
                    <option value=${person.name} ?selected=${this.test.person&&person==this.test.person}>${person.name}</option>
                    `})}
            </select>
        </p>
        <p>Sensitivity: <input id="sensin" type="number" .value=${String(this.test.sensitivity)} @change=${()=>this.test.sensitivity=Number.parseFloat((<HTMLInputElement>this.shadowRoot.getElementById("sensin")).value)}></p>
        <p>Specificity: <input id="specin" type="number" .value=${String(this.test.specificity)} @change=${()=>this.test.specificity=Number.parseFloat((<HTMLInputElement>this.shadowRoot.getElementById("specin")).value)}></p>
        <p>Date of test: <input id="date" type="date" .valueAsDate=${this.test.date} @change=${()=>this.test.setDate(new Date((<HTMLInputElement>this.shadowRoot.getElementById("date")).value))}></p>
        <p>Positive?: <input id="posin" type="checkbox" .checked=${this.test.positive} @change=${()=>this.test.positive=((<HTMLInputElement>this.shadowRoot.getElementById("posin")).checked)}></p>
        <button @click=${()=>{this.eventline.removeEvent(this.test);this.close(null);}}>remove</button>
        <button @click=${this.close}>close</button>
        `
    }
    person1change(event:Event){
        const select:HTMLSelectElement=<HTMLSelectElement> this.shadowRoot.getElementById("person1select");
        const selected=select.value;
        for(let person of this.simulation.persons){
            if(person.name==selected){
                this.test.person=person;
            }
        }
    }

    close(event:Event){
        if(!this.test.person){
            alert("please specify the persons having contact!");
            return;
        }
        this.onfinish();
        this.remove();
    }
}