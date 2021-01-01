import {Person} from "../../../logic/Person.js";
import {LitElement,html} from "lit-element";

export class PersonEditor extends LitElement{
    static get properties(){
        return {
            edit:{

            }
        };
    }
    constructor(toEdit=new Person("")){
        super();
        this.person=toEdit;
        this.attachShadow({mode:"closed"});
        this.addEventListener("click",(event)=>{

        });
    }
    render(){
        return html`
            <p>${this.person.name}</p>
        `;
    }


}
customElements.define("person-editor",PersonEditor);