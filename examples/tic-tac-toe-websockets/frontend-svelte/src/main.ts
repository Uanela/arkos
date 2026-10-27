import { mount } from "svelte";
import "./index.css";
import App from "./App.svelte";

export default mount(App, { target: document.getElementById("app")! });
