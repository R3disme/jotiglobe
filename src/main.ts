import { mount } from 'svelte';
import './app.css';
import './flags.css';
import Root from './Root.svelte';

mount(Root,{ target: document.getElementById('app')! });
