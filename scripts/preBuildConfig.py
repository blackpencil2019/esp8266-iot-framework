import json
import binascii

import inspect, os.path

def preBuildConfigFun():
    filename = inspect.getframeinfo(inspect.currentframe()).filename
    dir_path = os.path.dirname(os.path.abspath(filename))

    with open(dir_path + '/../gui/js/configuration.json', encoding='utf-8') as f:
        data = json.load(f)

    data = sorted(data, key=lambda x: (1 if ('hidden' in x and x['hidden']) else 0, x['name'] if 'name' in x else ''))

    with open(dir_path + '/../gui/js/configuration.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    #loop through variables
    h_persist = []
    h_lines = []
    cpp_lines = []
    first = True
    for item in data: 
                        
        if item['type'] != 'separator' and item['type'] != 'label' and item['type'] != 'header': 
            if first==True:
                first=False
            else:
                cpp_lines.append(',\n')

            if item['type'] == 'char':
                initial = "\t\"" + item['value'] + "\""
                member = "\tchar " + item['name'] + "[" + str(item['length']) + "];\n"   
            elif item['type'] == 'color':
                initial = "\t{" + str(item['value'][0]) + ',' + str(item['value'][1]) + ',' + str(item['value'][2]) + '}'
                member = "\tuint8_t " + item['name'] +"[3];\n"
            elif item['type'] == 'bool':
                initial = "\t" + str(item['value']).lower()
                member = "\t" + item['type'] + " " + item['name'] +";\n"
            else:
                initial = "\t" + str(item['value'])
                member = "\t" + item['type'] + " " + item['name'] +";\n"

            cpp_lines.append(initial)
            h_lines.append(member)

            if not('hidden' in item and item['hidden']):
                h_persist.append(member)

    # binascii.crc32(mes.encode('utf8'))
    #headers
    filename = "config"
    with open(dir_path + "/../src/generated/" + filename + ".h", "w", encoding="utf8") as h:
        h.write("#ifndef CONFIG_H\n")
        h.write("#define CONFIG_H\n\n")
        h.write("struct configData\n{\n")
        for line in h_lines:
            h.write(line)
        h.write("};\n\n")
        h.write("struct configDataPersist\n{\n")
        for line in h_persist:
            h.write(line)
        #footers
        h.write("};\n\nextern uint32_t configVersion;\n")
        h.write("extern const configData defaults;\n\n")
        h.write("#endif")

    with open(dir_path + "/../src/generated/" + filename + ".cpp", "w", encoding="utf8") as cpp:
        cpp.write("#include <Arduino.h>\n")
        cpp.write("#include \"config.h\"\n\n")
        cpp.write("uint32_t configVersion = " + str(binascii.crc32(b"".join(s.encode("utf-8") for s in h_persist))) + "; //generated identifier to compare config with EEPROM\n\n")
        cpp.write("const configData defaults PROGMEM =\n{\n")
        for line in cpp_lines:
            cpp.write(line)
        cpp.write("\n};")
        

if __name__ == "__main__":
    preBuildConfigFun()
