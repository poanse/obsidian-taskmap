import { Notice, TAbstractFile, type App, TFile, TFolder } from "obsidian";
import type { ProjectData } from "./data/ProjectData.svelte";
import type { TaskData } from "./types";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import { deserializeProjectData, updateFile } from "./SaveManager";
import { generateMarkdownLink } from "./LinkManager";


export function getOnRename(app: App) {
    return async (file: TAbstractFile, oldPath: string) => {
        console.debug(`${file.path} renamed`);
        let files: TFile[];
        if (file instanceof TFile) {
            files = [file];
        } else if (file instanceof TFolder) {
            files = app.vault
                .getMarkdownFiles()
                .filter((mdFile) =>
                    mdFile.path.startsWith(file.path + "/"),
                );
        } else {
            return;
        }
        await handleRenameFiles(
            app,
            files,
            oldPath,
            file.path,
        );
    };
}

export async function handleRenameFiles(
    app: App,
    changedMdFiles: TFile[],
    oldPath: string,
    newPath: string,
) {
    const taskmapFiles = app.vault
        .getFiles()
        .filter((file) => file.path.endsWith(".taskmap"));

    const updatedTaskMapFilePaths: Set<string> = new Set<string>();

    // update paths in taskmap files
    for (const taskmapFile of taskmapFiles) {
        console.debug(`handling ${taskmapFile.path}`);
        let projectData: ProjectData;
        try {
            const projectDataRaw = await app.vault.read(taskmapFile);
            projectData = deserializeProjectData(projectDataRaw);
        } catch (e) {
            console.error(`Taskmap rename hook: skipped invalid file ${taskmapFile.path}`);
            new Notice(`Taskmap rename hook: skipped invalid file: ${String(e)}`);
            continue;
        }
        const mapping = new Map<string, TaskData>();
        projectData.tasks.forEach((t) => {
            if (t.path) {
                if (t.path.startsWith(oldPath)) {
                    t.path = newPath + t.path.slice(oldPath.length);
                }
                mapping.set(t.path, t);
            }
        });
        console.debug("mapping " + JSON.stringify(mapping.keys()));
        let changed = false;
        changedMdFiles.forEach((mdFile) => {
            if (mapping.has(mdFile.path)) {
                const t = mapping.get(mdFile.path)!;
                t.name = generateMarkdownLink(app, mdFile);
                changed = true;
            }
        });
        if (changed) {
            console.debug(`${taskmapFile.path} changed`);
            // resave file on the file system
            await updateFile(app, taskmapFile, projectData);
            updatedTaskMapFilePaths.add(taskmapFile.path);
        } else {
            console.debug(`${taskmapFile.path} not changed`);
        }
    }

    // refresh active views
    for (const view of app.workspace
        .getLeavesOfType(TASKMAP_VIEW_TYPE)
        .map((l) => l.view)
        .filter((view) => view instanceof TaskmapView)
        .filter(
            (view) =>
                view.file && updatedTaskMapFilePaths.has(view.file.path),
        )) {
        await view.refreshUi();
    }
}
