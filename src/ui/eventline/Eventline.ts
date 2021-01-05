import { TimelineElement } from "../TimelineElement";
import { Contact } from "../../logic/Contact";
import { EventUI } from "./EventUI";
import { css, customElement, html, property } from "lit-element";
import { Simulation } from "../../logic/Simulation";
import { PersonEditor } from "../settings/PersonEditor";
import { Person } from "../../logic/Person";
import { EventEditor } from "./EventEditor";
import { SimUI } from "../SimUI";

@customElement("event-line")
export class Eventline extends TimelineElement {
    simulation: Simulation;
    simui:SimUI;
    constructor(simui: SimUI) {
        super();
        this.simulation = simui.simulation;
        this.simui=simui;
        for(let element of this.simulation.contacts){
            this.addEvent(element);
        }
    }
    onScaleChange(newScale: number): void {

    }
    onDateChange(newDateBeginning: Date): void {
        const newScrollingPosition = (newDateBeginning.getTime() - this.simulation.initialDate.getTime()) * this.scale / 1000 / 60 / 60 / 24;
        this.window.scrollTo(newScrollingPosition, 0);
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
        `
    }
    private events: Contact[] = [];
    private eventUIs: EventUI[] = [];
    private window:HTMLDivElement|null;

    updated(){
        this.window=<HTMLDivElement>this.shadowRoot.getElementById("window");
        this.window.onscroll = (ev) => {
            requestAnimationFrame((time) => {
                this.simui.setScrollingDate(new Date(this.window.scrollLeft / this.scale * 1000 * 60 * 60 * 24 + this.simulation.initialDate.getTime()),this)
            })
        }
    }
    addEvent(event: Contact) {
        this.events.push(event);
        this.eventUIs.push(new EventUI(event,this));
        this.simulation.addContact(event);
        this.requestUpdate();
    }
    deepUpdate(){
        this.eventUIs=[];
        for(let event of this.events){
            this.eventUIs.push(new EventUI(event,this));
        }
        this.requestUpdate();
    }
    render() {
        const maxDateMS = Math.max(...this.events.map((ev) => ev.date.getTime()));
        const maxX = (maxDateMS - this.simulation.initialDate.getTime()) * this.scale / 1000 /24/ 60 / 60;
        return html`
            <div id="window">
                <div id="event-adder" @click=${this.addContact}>Add event</div>
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
        const newUI=new EventEditor(this.simulation);
        newUI.onfinish=()=>{
            this.addEvent(newUI.contact);
        }
        this.shadowRoot.appendChild(newUI);
    }
}