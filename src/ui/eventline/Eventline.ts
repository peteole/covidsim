import {TimelineElement} from "../TimelineElement";
import { Contact } from "../../logic/Contact"
import {EventUI} from "./EventUI";

class Eventline extends TimelineElement{
    onScaleChange(newScale: number): void {

    }
    onDateChange(newDateBeginning: Date): void {
    }
    private events:Contact[]=[];
    private eventUIs:EventUI[]=[];
    addEvent(event:Contact){
        this.events.push(event);
        this.eventUIs.push(new EventUI(event));
    }
    render(){
        
    }
}