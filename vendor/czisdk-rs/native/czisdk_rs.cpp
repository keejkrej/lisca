#include <algorithm>
#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <exception>
#include <fstream>
#include <iterator>
#include <limits>
#include <memory>
#include <mutex>
#include <new>
#include <stdexcept>
#include <string>

#include <libCZI.h>

extern "C" {

struct CzisdkRect {
    std::int32_t x;
    std::int32_t y;
    std::int32_t w;
    std::int32_t h;
};

struct CzisdkSize {
    std::uint32_t w;
    std::uint32_t h;
};

struct CzisdkInterval {
    std::uint8_t valid;
    std::int32_t start;
    std::int32_t size;
};

struct CzisdkStats {
    std::int32_t subblock_count;
    std::int32_t min_m_index;
    std::int32_t max_m_index;
    CzisdkRect bounding_box;
    CzisdkRect bounding_box_layer0;
    CzisdkInterval dims[10];
    std::int32_t scene_count;
};

struct CzisdkSceneBoundingBox {
    std::int32_t scene;
    CzisdkRect bounding_box;
    CzisdkRect bounding_box_layer0;
};

struct CzisdkCoordinate {
    std::uint32_t valid_bits;
    std::int32_t values[10];
};

struct CzisdkSubBlockInfo {
    std::int32_t compression_mode_raw;
    std::int32_t pixel_type;
    CzisdkCoordinate coordinate;
    CzisdkRect logical_rect;
    CzisdkSize physical_size;
    std::int32_t m_index;
    std::int32_t pyramid_type;
};

struct CzisdkBitmap {
    std::uint32_t width;
    std::uint32_t height;
    std::uint32_t stride;
    std::int32_t pixel_type;
    std::uint64_t size;
    void* data;
};

struct CzisdkBlob {
    std::uint64_t size;
    void* data;
};

struct CzisdkReader;

int czisdk_open(const char* path, CzisdkReader** out_reader, char* error, std::size_t error_len);
void czisdk_close(CzisdkReader* reader);
int czisdk_version(CzisdkReader* reader, std::int32_t* major, std::int32_t* minor, char* error, std::size_t error_len);
int czisdk_stats(CzisdkReader* reader, CzisdkStats* out, char* error, std::size_t error_len);
int czisdk_scene_bbox(CzisdkReader* reader, std::int32_t ordinal, CzisdkSceneBoundingBox* out, char* error, std::size_t error_len);
int czisdk_subblock_info(CzisdkReader* reader, std::int32_t index, CzisdkSubBlockInfo* out, char* error, std::size_t error_len);
int czisdk_read_plane(CzisdkReader* reader, const CzisdkCoordinate* coordinate, const CzisdkRect* roi, CzisdkBitmap* out, char* error, std::size_t error_len);
int czisdk_metadata_xml(CzisdkReader* reader, CzisdkBlob* out, char* error, std::size_t error_len);
void czisdk_free(void* ptr);
}

class FileStream final : public libCZI::IStream {
public:
    explicit FileStream(const char* path) : file_(path, std::ios::binary) {
        if (!file_) {
            throw std::runtime_error("failed to open CZI file");
        }
    }

    void Read(std::uint64_t offset, void* pv, std::uint64_t size, std::uint64_t* ptrBytesRead) override {
        std::lock_guard<std::mutex> lock(mutex_);
        file_.clear();
        file_.seekg(static_cast<std::streamoff>(offset), std::ios::beg);
        if (!file_) {
            throw std::runtime_error("failed to seek CZI stream");
        }
        file_.read(static_cast<char*>(pv), static_cast<std::streamsize>(size));
        const auto read = file_.gcount();
        if (ptrBytesRead != nullptr) {
            *ptrBytesRead = static_cast<std::uint64_t>(read);
        }
        if (read < 0) {
            throw std::runtime_error("failed to read CZI stream");
        }
    }

private:
    std::ifstream file_;
    std::mutex mutex_;
};

struct CzisdkReader {
    std::shared_ptr<libCZI::IStream> stream;
    std::shared_ptr<libCZI::ICZIReader> reader;
    std::shared_ptr<libCZI::ISingleChannelTileAccessor> tile_accessor;
};

namespace {

void set_error(char* error, std::size_t error_len, const std::string& message) {
    if (error == nullptr || error_len == 0) {
        return;
    }
    const std::size_t count = std::min(error_len - 1, message.size());
    std::memcpy(error, message.data(), count);
    error[count] = '\0';
}

template <typename F>
int guard(char* error, std::size_t error_len, F&& f) {
    try {
        f();
        return 0;
    } catch (const std::exception& ex) {
        set_error(error, error_len, ex.what());
        return -1;
    } catch (...) {
        set_error(error, error_len, "unknown libCZI error");
        return -1;
    }
}

CzisdkRect convert_rect(const libCZI::IntRect& rect) {
    return CzisdkRect{rect.x, rect.y, rect.w, rect.h};
}

CzisdkSize convert_size(const libCZI::IntSize& size) {
    return CzisdkSize{size.w, size.h};
}

std::int32_t pixel_type_raw(libCZI::PixelType pixel_type) {
    return static_cast<std::int32_t>(pixel_type);
}

std::int32_t pyramid_type_raw(libCZI::SubBlockPyramidType pyramid_type) {
    return static_cast<std::int32_t>(pyramid_type);
}

std::size_t bytes_per_pixel(std::int32_t pixel_type) {
    switch (pixel_type) {
        case 0: return 1;
        case 1: return 2;
        case 2: return 4;
        case 3: return 3;
        case 4: return 6;
        case 8: return 12;
        case 9: return 4;
        case 10: return 16;
        case 11: return 24;
        case 12: return 4;
        case 13: return 8;
        default: throw std::runtime_error("unsupported libCZI pixel type");
    }
}

libCZI::DimensionIndex dim_from_raw(int dim) {
    return static_cast<libCZI::DimensionIndex>(dim);
}

CzisdkCoordinate convert_coordinate(const libCZI::CDimCoordinate& coordinate) {
    CzisdkCoordinate out{};
    coordinate.EnumValidDimensions([&](libCZI::DimensionIndex dim, int value) {
        const auto raw = static_cast<int>(dim);
        if (raw >= 1 && raw <= 9) {
            out.valid_bits |= (1u << raw);
            out.values[raw] = value;
        }
        return true;
    });
    return out;
}

libCZI::CDimCoordinate convert_coordinate(const CzisdkCoordinate* coordinate) {
    libCZI::CDimCoordinate out;
    if (coordinate == nullptr) {
        return out;
    }
    for (int dim = 1; dim <= 9; ++dim) {
        if ((coordinate->valid_bits & (1u << dim)) != 0) {
            out.Set(dim_from_raw(dim), coordinate->values[dim]);
        }
    }
    return out;
}

CzisdkSubBlockInfo convert_subblock(const libCZI::SubBlockInfo& info) {
    CzisdkSubBlockInfo out{};
    out.compression_mode_raw = info.compressionModeRaw;
    out.pixel_type = pixel_type_raw(info.pixelType);
    out.coordinate = convert_coordinate(info.coordinate);
    out.logical_rect = convert_rect(info.logicalRect);
    out.physical_size = convert_size(info.physicalSize);
    out.m_index = info.mIndex;
    out.pyramid_type = pyramid_type_raw(info.pyramidType);
    return out;
}

void fill_stats(const libCZI::SubBlockStatistics& stats, CzisdkStats* out) {
    std::memset(out, 0, sizeof(*out));
    out->subblock_count = stats.subBlockCount;
    out->min_m_index = stats.minMindex;
    out->max_m_index = stats.maxMindex;
    out->bounding_box = convert_rect(stats.boundingBox);
    out->bounding_box_layer0 = convert_rect(stats.boundingBoxLayer0Only);
    out->scene_count = static_cast<std::int32_t>(stats.sceneBoundingBoxes.size());
    stats.dimBounds.EnumValidDimensions([&](libCZI::DimensionIndex dim, int start, int size) {
        const auto raw = static_cast<int>(dim);
        if (raw >= 1 && raw <= 9) {
            out->dims[raw] = CzisdkInterval{1, start, size};
        }
        return true;
    });
}

}

extern "C" int czisdk_open(const char* path, CzisdkReader** out_reader, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (path == nullptr || out_reader == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_open");
        }
        auto stream = std::make_shared<FileStream>(path);
        auto reader = libCZI::CreateCZIReader();
        reader->Open(stream);
        auto accessor = reader->CreateSingleChannelTileAccessor();
        if (!accessor) {
            throw std::runtime_error("failed to create libCZI tile accessor");
        }
        auto handle = std::make_unique<CzisdkReader>();
        handle->stream = std::move(stream);
        handle->reader = std::move(reader);
        handle->tile_accessor = std::move(accessor);
        *out_reader = handle.release();
    });
}

extern "C" void czisdk_close(CzisdkReader* reader) {
    if (reader == nullptr) {
        return;
    }
    try {
        if (reader->reader) {
            reader->reader->Close();
        }
    } catch (...) {
    }
    delete reader;
}

extern "C" int czisdk_version(CzisdkReader* reader, std::int32_t* major, std::int32_t* minor, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (reader == nullptr || major == nullptr || minor == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_version");
        }
        const auto info = reader->reader->GetFileHeaderInfo();
        *major = info.majorVersion;
        *minor = info.minorVersion;
    });
}

extern "C" int czisdk_stats(CzisdkReader* reader, CzisdkStats* out, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (reader == nullptr || out == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_stats");
        }
        fill_stats(reader->reader->GetStatistics(), out);
    });
}

extern "C" int czisdk_scene_bbox(CzisdkReader* reader, std::int32_t ordinal, CzisdkSceneBoundingBox* out, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (reader == nullptr || out == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_scene_bbox");
        }
        const auto stats = reader->reader->GetStatistics();
        if (ordinal < 0 || ordinal >= static_cast<std::int32_t>(stats.sceneBoundingBoxes.size())) {
            throw std::out_of_range("scene bounding-box ordinal out of range");
        }
        auto it = stats.sceneBoundingBoxes.begin();
        std::advance(it, ordinal);
        out->scene = it->first;
        out->bounding_box = convert_rect(it->second.boundingBox);
        out->bounding_box_layer0 = convert_rect(it->second.boundingBoxLayer0);
    });
}

extern "C" int czisdk_subblock_info(CzisdkReader* reader, std::int32_t index, CzisdkSubBlockInfo* out, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (reader == nullptr || out == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_subblock_info");
        }
        libCZI::SubBlockInfo info;
        if (!reader->reader->TryGetSubBlockInfo(index, &info)) {
            throw std::out_of_range("subblock index out of range");
        }
        *out = convert_subblock(info);
    });
}

extern "C" int czisdk_read_plane(CzisdkReader* reader, const CzisdkCoordinate* coordinate, const CzisdkRect* roi, CzisdkBitmap* out, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (reader == nullptr || coordinate == nullptr || roi == nullptr || out == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_read_plane");
        }
        std::memset(out, 0, sizeof(*out));
        auto dim_coordinate = convert_coordinate(coordinate);
        libCZI::IntRect rect{roi->x, roi->y, roi->w, roi->h};
        libCZI::ISingleChannelTileAccessor::Options options;
        options.Clear();
        options.backGroundColor = libCZI::RgbFloatColor{0.0f, 0.0f, 0.0f};
        options.sortByM = true;
        options.useVisibilityCheckOptimization = true;

        auto bitmap = reader->tile_accessor->Get(rect, &dim_coordinate, &options);
        if (!bitmap) {
            throw std::runtime_error("libCZI returned no bitmap for requested plane");
        }

        const auto size = bitmap->GetSize();
        const auto pixel_type = pixel_type_raw(bitmap->GetPixelType());
        const auto row_bytes = static_cast<std::size_t>(size.w) * bytes_per_pixel(pixel_type);
        const auto total = row_bytes * static_cast<std::size_t>(size.h);
        void* data = std::malloc(total);
        if (data == nullptr && total != 0) {
            throw std::bad_alloc();
        }

        libCZI::ScopedBitmapLockerSP locked(bitmap);
        auto* dst = static_cast<std::uint8_t*>(data);
        auto* src = static_cast<const std::uint8_t*>(locked.ptrDataRoi);
        for (std::uint32_t y = 0; y < size.h; ++y) {
            std::memcpy(dst + y * row_bytes, src + y * locked.stride, row_bytes);
        }

        out->width = size.w;
        out->height = size.h;
        out->stride = static_cast<std::uint32_t>(row_bytes);
        out->pixel_type = pixel_type;
        out->size = static_cast<std::uint64_t>(total);
        out->data = data;
    });
}

extern "C" int czisdk_metadata_xml(CzisdkReader* reader, CzisdkBlob* out, char* error, std::size_t error_len) {
    return guard(error, error_len, [&] {
        if (reader == nullptr || out == nullptr) {
            throw std::invalid_argument("null argument passed to czisdk_metadata_xml");
        }
        std::memset(out, 0, sizeof(*out));
        auto segment = reader->reader->ReadMetadataSegment();
        if (!segment) {
            return;
        }
        size_t size = 0;
        auto data = segment->GetRawData(libCZI::IMetadataSegment::XmlMetadata, &size);
        if (!data || size == 0) {
            return;
        }
        void* copy = std::malloc(size);
        if (copy == nullptr) {
            throw std::bad_alloc();
        }
        std::memcpy(copy, data.get(), size);
        out->size = static_cast<std::uint64_t>(size);
        out->data = copy;
    });
}

extern "C" void czisdk_free(void* ptr) {
    std::free(ptr);
}
