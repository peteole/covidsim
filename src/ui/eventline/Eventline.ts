import { TimelineElement } from "../TimelineElement";
import { Contact } from "../../logic/Contact";
import { EventUI } from "./EventUI";
import { css, customElement, html, property } from "lit-element";
import { Simulation } from "../../logic/Simulation";
import { PersonEditor } from "../settings/PersonEditor";
import { Person } from "../../logic/Person";
import { EventEditor } from "./EventEditor";
import { SimUI } from "../SimUI";
import { Test } from "../../logic/Test";
import { TestUI } from "./TestUI";
import { TestEditor } from "./TestEditor";

@customElement("event-line")
export class Eventline extends TimelineElement {
    simulation: Simulation;
    simui:SimUI;
    scrolltoTriggered:boolean=false;
    constructor(simui: SimUI) {
        super();
        this.simulation = simui.simulation;
        this.simui=simui;
        for(let element of this.simulation.contacts){
            this.addEvent(element);
        }
    }
    onScaleChange(newScale: number): void {
        this.deepUpdate();
    }
    onDateChange(newDateBeginning: Date): void {
        const newScrollingPosition = (newDateBeginning.getTime() - this.simulation.initialDate.getTime()) * this.scale / 1000 / 60 / 60 / 24;
        this.window.scrollTo(newScrollingPosition, 0);
        this.scrolltoTriggered=true;
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
                width:100%;
                height:200px;
                overflow-x:auto;
            }
            #event-buttons{
                text-align:center;
            }
        `
    }
    private events: (Contact|Test)[] = [];
    private eventUIs: (EventUI|TestUI)[] = [];
    private window:HTMLDivElement|null;

    updated(){
        this.window=<HTMLDivElement>this.shadowRoot.getElementById("window");
        this.window.onscroll = (ev) => {
            if(this.scrolltoTriggered){
                this.scrolltoTriggered=false;
                return;
            }
            requestAnimationFrame((time) => {
                this.simui.setScrollingDate(new Date(this.window.scrollLeft / this.scale * 1000 * 60 * 60 * 24 + this.simulation.initialDate.getTime()),this)
            })
        }
    }
    /**add contact via api */
    addEvent(event: Contact|Test) {
        this.events.push(event);
        if(event instanceof Contact){
            this.eventUIs.push(new EventUI(event,this));
            this.simulation.addContact(event);
        }else{
            this.eventUIs.push(new TestUI(event,this));
            this.simulation.observations.push(event);
        }
        this.requestUpdate();
    }
    /**remove event via api */
    removeEvent(event: Contact|Test) {
        const index=this.events.indexOf(event);
        if(index==-1){
            console.exception("event does not exist");
            return;
        }
        this.events.splice(index,1);
        this.eventUIs.splice(index,1);
        if(event instanceof Contact){
            const eventIndex=this.simulation.contacts.indexOf(event);
            this.simulation.contacts.splice(eventIndex,1);
        }else{
            const obsIndex=this.simulation.observations.indexOf(event);
            this.simulation.observations.splice(obsIndex,1);
        }
        this.simulation.refreshContacts();
        this.requestUpdate();
    }
    deepUpdate(){
        this.eventUIs=[];
        for(let event of this.events){
            if(event instanceof Contact){
                this.eventUIs.push(new EventUI(event,this));
            }else{
                this.eventUIs.push(new TestUI(event,this));
            }
        }
        this.requestUpdate();
    }
    render() {
        const maxDateMS = Math.max(...this.events.map((ev) => ev.date.getTime()));
        const maxX = (maxDateMS - this.simulation.initialDate.getTime()) * this.scale / 1000 /24/ 60 / 60;
        return html`
            <p id="event-buttons"><button id="event-adder" @click=${this.addContact}>+contact</button> | <button id="test-adder" @click=${this.addTest}>+test</button>
            </p>
            <div id="window">
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
    /**add contact via ui */
    addContact(){
        if(this.simui.simulation.persons.size<2){
            alert("There must exist at least two persons to have a contact. Add them via settings!")
            return;
        }
        const newUI=new EventEditor(this);
        newUI.onfinish=()=>{
            this.addEvent(newUI.contact);
        }
        this.shadowRoot.appendChild(newUI);
    }
    /**add test via ui */
    addTest(){
        if(this.simui.simulation.persons.size<1){
            alert("There must exist at least one person to make a test. Add it via settings!")
            return;
        }
        const newUI=new TestEditor(this);
        newUI.onfinish=()=>{
            this.addEvent(newUI.test);
        }
        this.shadowRoot.appendChild(newUI);
    }
}