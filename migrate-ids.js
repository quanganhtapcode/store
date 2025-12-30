const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

const generateId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return `PRD-${result}`; // Total 10 chars (Ex: PRD-A1B2C3)
};

console.log("🚀 Starting ID Migration...");

db.serialize(() => {
    db.all("SELECT id, name FROM products", [], (err, rows) => {
        if (err) { console.error(err); return; }

        console.log(`Found ${rows.length} products needing check.`);

        db.run("BEGIN TRANSACTION");

        rows.forEach(row => {
            // Chỉ migrate những ID chưa chuẩn (Vd ngắn quá hoặc không bắt đầu bằng PRD-)
            if (!row.id.startsWith('PRD-') || row.id.length < 10) {
                const newId = generateId();
                console.log(`   🔄 Migrating: ${row.name} (${row.id}) -> ${newId}`);

                // 1. Update Product ID (Cần disable foreign key check nếu có, nhưng SQLite mặc định ok)
                // SQLite không hỗ trợ đổi trực tiếp PK dễ dàng, ta sẽ làm mẹo:
                // Vì cấu trúc đơn giản, ta update thẳng.

                db.run("UPDATE products SET id = ? WHERE id = ?", [newId, row.id]);

                // 2. Update logic tham chiếu trong Orders (JSON string replacement - Hơi trick nhưng hiệu quả nhanh)
                // Lưu ý: Cách này rủi ro nếu ID ngắn trùng lặp ký tự text khác, nhưng với ID cũ unique thì ổn.
                // Tuy nhiên, để an toàn tuyệt đối, ta bỏ qua phần update history orders cũ vì nó lưu snapshot JSON.
                // Chỉ cần đảm bảo sản phẩm hiện tại có ID mới để bán hàng tiếp.
            }
        });

        db.run("COMMIT", () => {
            console.log("✅ Migration Complete!");
        });
    });
});
