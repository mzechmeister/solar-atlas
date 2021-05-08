import numpy as np
import json
from os.path import getsize

WINDOW_SIZE = 4
MAX_ELEMENTS = 4000

filename = 'data/solar_atlas_V1'
#filename = 'data/tmp'
data = np.fromfile(filename, sep="\t").reshape(-1,3).T

print('finished loading data.')
print('----------------')


class LOD:
    # level of detail
    def __init__(self, level, data):
        self.level = level
        self.data = data
        self.xi = data[0]
        self.yi = data[1]
        self.LSIZE = WINDOW_SIZE**level
        self.K = int(np.ceil(self.xi.size/self.LSIZE)) # number of knots
        self.filename = 'data/solar_'+str(level)

    def process(self):
        # bin statistic
        xi = self.xi
        ki = np.floor(self.K * (xi-xi[0]) / (xi[-1]-xi[0])).astype(int)
        ki[-1] -= 1   # move the last point to last bin
        xk = np.linspace(xi[0], xi[-1], self.K+1)
        xk += (xk[1]-xk[0]) / 2
#        ymin = np.nan * xk
#        ymax = np.nan * xk
        ymin = 0. * xk
        ymax = 0. * xk
        sk = np.where(np.diff(ki))[0] + 1
        for start,stop in zip(np.hstack([0, sk]), np.hstack([sk,-1])):
            l = self.yi[start:stop]
            #print(start, stop,ki[start], np.min(l), np.max(l),l)
            ymin[ki[start]] = np.min(l)
            ymax[ki[start]] = np.max(l)

        self.xk = xk
        self.ymin = ymin
        self.ymax = ymax

    def write_to_file(self):
        precision = 10
        maxlength = len(str(int(np.max(self.xk)))) + precision + 1
        with open(self.filename, 'w') as fout:
            for k in range(self.K):
                fout.write('%0*.*f\t%.*f\t%.*f\n'%(maxlength, precision, self.xk[k], precision, self.ymin[k], precision, self.ymax[k]))
        print('created lod-file: ' + self.filename + '.')
        #end fout stream and create descriptor
        self.descriptor = {
                "fileName": self.filename,
                "fileSize": getsize(self.filename),
                "level": self.level,
                "nElements": self.K
                }


nLodLevels = int(np.ceil(np.log(len(data[0])/MAX_ELEMENTS)/np.log(WINDOW_SIZE)))
lodDescriptor = []

print('processing', nLodLevels, 'levels of detail.')
print('----------------')
for i in range(1, nLodLevels+1):
    p = LOD(i, data)
    p.process()
    p.write_to_file()
    lodDescriptor.append(p.descriptor)
print('----------------')

descriptor = {
        "fileName": filename,
        "fileSize": getsize(filename),
        "nElements": len(data[0]),
        "xMin": data[0].min(),
        "xMax": data[0].max(),
        "maxElements": MAX_ELEMENTS,
        "windowSize": WINDOW_SIZE,
        "lodFiles": lodDescriptor
        }

with open('data/descriptor.json', 'w') as outf:
    json.dump(descriptor, outf)
print('wrote to data/descriptor.json.\n exiting.')


