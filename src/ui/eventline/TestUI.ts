import { css, customElement, html, LitElement, property } from "lit-element";
import { Test } from "../../logic/Test";
import { Eventline } from "./Eventline";
import { TestEditor } from "./TestEditor";
@customElement("test-ui")
export class TestUI extends LitElement {
    event: Test;
    eventline: Eventline;
    static get styles() {
        return css`
            :host{
                position:absolute;
                width:100px;
                height:180px;
                text-align:center;
                border-radius:3px;
            }
            :host>div{
                padding:3px;
            }
        `
    }
    constructor(test:Test,eventline:Eventline){
        super();
        this.event=test;
        this.eventline=eventline;
    }
    render(){
        return html`
        <div style="background-color:${this.event.positive?"red":"green"}">
            <p>${this.event.person.name} tests ${this.event.positive?"positive":"negative"}</p>
            <p>sens: ${this.event.sensitivity}, spez: ${this.event.specificity}</p>
            <button @click=${this.edit}>edit</button>
        </div>
        `
    }
    edit(ev:Event){
        const editor = new TestEditor(this.eventline, this.event);
        editor.onfinish = () => {
            this.requestUpdate();
            this.eventline.requestUpdate();
        }
        document.body.appendChild(editor);
    }
}