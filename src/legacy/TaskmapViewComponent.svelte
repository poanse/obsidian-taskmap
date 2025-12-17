<script lang="ts">
import type {TaskmapView} from "../TaskmapView";
import Task from "../components/Task.svelte";

let {
	taskmapView
}: {
	taskmapView: TaskmapView;
} = $props();
</script>

<div> 
	<p>Hello world!</p>
	<Task taskData={taskmapView.projectData.taskData} taskmapView={taskmapView} />
</div>
