import { Person } from "../../logic/Person";
import { LitElement, html, property, customElement, css } from "lit-element";
@customElement("person-editor")
export class PersonEditor extends LitElement {
    static get styles() {
        return css`
            :host{
                z-index:100;
                background-color:grey;
                width:200px;
            }
        `
    }
    person: Person;
    constructor(toEdit = new Person("")) {
        super();
        this.person = toEdit;
    }
    render() {
        return html`
        <h2>Edit person</h2>
        <p>Name: <input .value=${this.person.name}></p>
        <button @click=${()=>this.remove()}></button>
        `;
    }

}