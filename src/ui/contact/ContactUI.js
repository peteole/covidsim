import {Person} from "../../logic/Person.js";

export class ContactUI extends HTMLElement{
    constructor(){
        super();
        this.attachShadow({mode:"closed"});
        
    }
}

customElements.define("contact-ui",ContactUI,{extends:HTMLElement});