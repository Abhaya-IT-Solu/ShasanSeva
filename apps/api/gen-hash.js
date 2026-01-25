import bcrypt from 'bcrypt';

async function main() {
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:');
    console.log(hash);

    // Verify it works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verification:', isValid);
}

main();
