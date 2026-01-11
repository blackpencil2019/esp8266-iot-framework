import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import styled from "styled-components";

import { Fetch, Flex, RedButton, Button, buttonStyle, cPrimary, Alert, Spinner } from "./UiComponents";
import { FiFile as File, FiFolder as Folder, FiTrash2 as Trash2, FiDownload as Download, FiArrowUp as ArrowUp } from "react-icons/fi";

import Config from "./../configuration.json";
let loc;
if (Config.find(entry => entry.name === "language")) {
    loc = require("./../lang/" + Config.find(entry => entry.name === "language").value + ".json");
} else {
    loc = require("./../lang/en.json");
}

const FileLine = styled(Flex)`
    padding:0.35em 0.35em;
    border-bottom:1px solid #ddd;
    
    :last-child 
    {
        border-bottom:0px;
    }

    &.selectable {
        span {
            text-decoration:underline;
        }
        cursor:pointer;
        // padding-left:0.35em;
        // padding-right:0.35em;
    }

    &.selectable:hover {
        background-color:#ff00cc11;
    }

    span
    {
        margin-left:0.6em;
    }

    Button
    {
        padding:0.4em 0.5em;        
    }

    div:first-child
    {
        padding:0.4em 0em;
    }

    svg 
    {
        vertical-align: -0.15em;
    }

    @media (max-width: 500px) 
    {
        flex-wrap:wrap;
        div:first-child {
            width:100%;
            margin-bottom:0.4em;
        }
    }
`;

export function FileListing(props) {
    const [state, setState] = useState({ files: [], used: 0, max: 0 });
    const [currentDir, setCurrentDir] = useState(props.listDir);

    useEffect(() => {
        fetchData();
    }, [currentDir]);

    function fetchData() {
        fetch(`${props.API}/api/files/list?dir=${currentDir}`)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                data.files = data.files.sort((a, b) => {
                    if (a.isdir && !b.isdir) return -1;
                    if (!a.isdir && b.isdir) return 1;
                    return a.name.localeCompare(b.name, undefined, {
                        numeric: true
                    });
                });
                setState(data);
            });
    }

    let list;
        
    if (state.max > 0) {
        let filtered = 0;
        for (let i = 0; i < state.files.length; i++) {
            const name = state.files[i].name;
            if (state.files[i].isdir || typeof props.filter === "undefined"
                || name.substr(name.length - (props.filter.length + 1)) == `.${props.filter}`) {filtered++;break;}
        }

        if (filtered == 0) {
            list = <FileLine><div>{loc.filesEmpty}</div></FileLine>;
        } else {
            for (let i = 0; i < state.files.length; i++) {
                const name = state.files[i].name;
                const isdir = state.files[i].isdir;
                if (isdir || typeof props.filter === "undefined" ||
                    name.substr(name.length - (props.filter.length + 1)) == `.${props.filter}`) {
                    list = <>{list}
                        <FileLine className={props.selectable || isdir ? "selectable" : ""}
                            onClick={() => {
                                if (isdir) { setCurrentDir(`${currentDir}${name}/`); }
                                else if (typeof props.onSelect !== "undefined") { props.onSelect(name); }
                            }}>
                            <div style={{ flex: 3 }}>{isdir ? <Folder /> : <File />}<span>{name}</span></div>
                            {!isdir && (
                                <div style={{ flex: 1 }}><span>{FormatFileSize(state.files[i].size)}</span></div>
                            )}
                            <div>
                                {!isdir && (
                                    <a href={`${props.API}/download${currentDir}${name}`} rel="noreferrer" target="_blank" onClick={(e) => { e.stopPropagation();}}>
                                        <Button title={loc.filesDl}><Download /></Button>
                                    </a>
                                )}
                                <Fetch href={`${props.API}/api/files/remove?${isdir ? "dir" : "filename"}=${encodeURIComponent(currentDir + name)}`} POST onFinished={fetchData}>
                                    <RedButton title={loc.filesRm} ><Trash2 /></RedButton>
                                </Fetch>   
                            </div>
                        </FileLine></>;
                }
            }   
        }  
    } else {
        list = <FileLine><div><Spinner /></div></FileLine>;
    }


    let header;
    if (props.selectable) {
        header = loc.filesFwTitle + ":";
    } else {
        header = loc.filesTitle;
    }

    const goBackDir = (path) => {
        if (path === '/')
            return '/';
        const lastSlashIdx = path.lastIndexOf('/', path.length - 2);
        return lastSlashIdx === 0 ? '/' : path.substring(0, lastSlashIdx + 1);
    };

    return <><Flex>
        <div><Upload action={`${props.API}/upload`} onFinished={fetchData} filter={props.filter} /></div>
        {parseInt(state.max) > 0 ? <div>{Math.round(state.used / 1000)} / {Math.round(state.max / 1000)} kB {loc.filesUsed}</div> : ""}
    </Flex>
        <h3>{header}
            { (currentDir != '/') && (
                <span style={{ cursor: 'pointer', padding: '4px', margin: '0px 8px', verticalAlign: 'middle' }}
                    onClick={() => { setCurrentDir(goBackDir(currentDir)); }}><ArrowUp />
                </span>
            )}
        </h3>{list}</>;
    
}

FileListing.defaultProps = {
    listDir: "/",
};

FileListing.propTypes = {
    API: PropTypes.string,
    onSelect: PropTypes.func,
    filter: PropTypes.string,
    selectable: PropTypes.bool,
    listDir: PropTypes.string,
};

const FormatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};

function Upload(props) {
    const [state, setState] = useState("");

    let status;
    if (state == "busy") {status = <><Spinner /></>;} else {status = <>{loc.filesBtn}</>;}

    const render =
        <><form action={props.action} method="post" name="upload" encType="multipart/form-data">
            <FileLabel id="uploadLabel" className={state}>{status}<input type="file" id="file"
                onClick={(e) => {
                    if (state == "busy") {
                        e.preventDefault();
                    }
                }}
                onChange={(e) => {
                    const form = document.forms.namedItem("upload");
                    const files = e.target.files;
                    const formData = new FormData();

                    if (files.length > 0) {
                        if (typeof props.filter === "undefined"
                            || files[0].name.substr(files[0].name.length - (props.filter.length + 1)) == `.${props.filter}`) {
                            setState("busy");

                            formData.append("myFile", files[0]);

                            fetch(form.action, {
                                method: "POST",
                                body: formData,
                            }).then((response) => { return response.json(); })
                                .then((data) => {
                                    if (data.success == true) {
                                        setState("ok");
                                        props.onFinished();
                                    } else {
                                        setState("nok");
                                    }
                                });
                        } else {
                            setState("wrongtype");
                        }

                    }
                }} />
            </FileLabel>
        </form>
        <Alert active={state == "nok"}
            confirm={() => setState("")}>
            {loc.filesMsg1}</Alert>
        <Alert active={state == "wrongtype"}
            confirm={() => setState("")}>
            {loc.filesMsg2} (.{props.filter})</Alert>
        </>;

    return render;
}

const FileLabel = styled.label`
    ${buttonStyle}  

    display:inline-block;
    //width:100px;
    text-align:center;
    
    @media (max-width: 500px) 
    {
        width:90px; 
    }

    &.busy 
    {
        cursor: default;
        :hover
        {
            background-color: ${cPrimary};
        }
    }

    svg {
        width:1.2em;
        height:1.2em;
        vertical-align:-0.25em;
    }

    input[type="file"] {
        display: none;
    } 
`;