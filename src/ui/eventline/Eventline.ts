import { TimelineElement } from "../TimelineElement";
import { Contact } from "../../logic/Contact";
import { EventUI } from "./EventUI";
import { css, customElement, html } from "lit-element";
import { Simulation } from "../../logic/Simulation";
import { PersonEditor } from "../person/PersonEditor";
import { Person } from "../../logic/Person";

@customElement("event-line")
export class Eventline extends TimelineElement {
    simulation: Simulation;
    constructor(simulation: Simulation) {
        super();
        this.simulation = simulation;
        for(let element of this.simulation.contacts){
            this.addEvent(element);
        }
    }
    onScaleChange(newScale: number): void {

    }
    onDateChange(newDateBeginning: Date): void {
    }
    static get styles() {
        return css`
            #container{
                position:relative;
            }
            :host{
                overflow-x:auto;
            }
            #window{
                width:800px;
                height:200px;
                overflow-x:auto;
            }
        `
    }
    private events: Contact[] = [];
    private eventUIs: EventUI[] = [];
    addEvent(event: Contact) {
        this.events.push(event);
        this.eventUIs.push(new EventUI(event));
        this.simulation.addContact(event);
    }
    render() {
        const maxDateMS = Math.max(...this.events.map((ev) => ev.date.getTime()));
        const maxX = (maxDateMS - this.simulation.initialDate.getTime()) * this.scale / 1000 /24/ 60 / 60;
        return html`
            <div id="window">
                <div id="event-adder" @click=${this.addContact}></div>
                <div id="container" style="width:${ maxX}px">
                    ${this.eventUIs.map((ui) => {
                        ui.style.left = (ui.event.date.getTime() - this.simulation.initialDate.getTime()) / (1000 * 60 *24* 60) * this.scale +
                    "px";
                        return ui;
                    })}
                </div>
            </div>
        `
    }
    addContact(event:Event){
        const newPerson=new Person("");
        this.simulation.addPerson(newPerson);
        this.appendChild(new PersonEditor(newPerson));
    }
}